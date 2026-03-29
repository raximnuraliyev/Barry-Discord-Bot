require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');

// Import modules
const PersonalityHandler = require('./src/ai-personality');
const ModerationHandler = require('./src/moderation');
const DatabaseHandler = require('./src/database');
const CommandHandler = require('./src/commands');
const Reminders = require('./src/reminders');
const connectMongo = require('./src/mongo');

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
    // Don't exit - let the bot continue running
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit - let the bot continue running
});

// Main startup sequence: connect to Mongo, then start Barry
(async () => {
    try {
        await connectMongo();
        console.log('Mongo ready');
        // Initialize and start Barry
        const barry = new BarryBot();
        await barry.start();
    } catch (err) {
        console.error('Startup failed:', err);
        process.exit(1);
    }
})();

class BarryBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildModeration
            ]
        });

        this.personality = new PersonalityHandler();
        this.moderation = new ModerationHandler();
        this.database = new DatabaseHandler();
        this.commands = new CommandHandler();

        this.setupEventListeners();
        this.startReminderLoop();
    }

    setupEventListeners() {
        this.client.once('ready', async () => {
            console.log(`Barry is online! Logged in as ${this.client.user.tag}`);
            this.client.user.setActivity('Managing the server like a boss', { type: ActivityType.Watching });
            await this.registerCommands();
            // Seed default words for all guilds Barry is in
            for (const guild of this.client.guilds.cache.values()) {
                try {
                    const hasWords = await this.database.hasDefaultWords(guild.id);
                    if (!hasWords) {
                        console.log(`Seeding default words for ${guild.name}...`);
                        await this.database.seedDefaultOffensiveWords(guild.id);
                    }
                } catch (err) {
                    console.error(`Failed to seed words for ${guild.name}:`, err);
                }
            }
        });

        this.client.on('messageCreate', async (message) => {
            try {
                if (message.author.bot || message.author.id === this.client.user.id) return;

                // Update user activity
                this.database.updateUserActivity(message.author.id, message.guild?.id);

                // Check for moderation violations
                if (message.guild) {
                    await this.moderation.checkMessage(message);
                }

                // Check if this is a reply to Barry's message
                let isReplyToBarry = false;
                if (message.reference?.messageId) {
                    try {
                        const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
                        if (repliedTo.author.id === this.client.user.id) {
                            isReplyToBarry = true;
                        }
                    } catch {}
                }

                // Respond if Barry is mentioned, tagged, called by name, or replied to
                const barryVariants = [
                    /\bb+a+r+r*y+\b/i,   // barry, bary, baary, etc.
                    /\bb+e+r+r*y+\b/i,   // berry, bery, beerry, etc.
                    /\bb+i+r+r*y+\b/i,   // birry, biry, etc.
                    /\bb+a+r+r*i+e*\b/i, // barie, bari, barri, etc.
                    /\bb+a+r+e+y*\b/i,   // barey, bare, etc.
                    /\bb+a+r+e+i+\b/i,   // barei, etc.
                    /\bb+a+r+i+y*\b/i,   // bariy, bari, etc.
                    /\bb+a+r+y+e*\b/i,   // barye, etc.
                    /\bb+u+r+r*y+\b/i,   // burry, bury, etc.
                ];
                const isDirectMention = message.mentions.has(this.client.user);
                const isBarryText = barryVariants.some(rgx => rgx.test(message.content));
                
                // Respond if mentioned, name said, or replied to Barry
                if ((isDirectMention || isBarryText || isReplyToBarry) && message.guild) {
                    // Keep the original message content - only remove the @ mention tag itself
                    let cleanedContent = message.content;
                    if (isDirectMention) {
                        // Only remove the <@123456> mention, keep everything else including "Barry"
                        cleanedContent = cleanedContent.replace(new RegExp(`<@!?${this.client.user.id}>`, 'g'), '').trim();
                    }
                    
                    // Gather recent context (last 8 messages in channel)
                    const channelMessages = await message.channel.messages.fetch({ limit: 10 });
                    const context = Array.from(channelMessages.values())
                        .filter(m => m.id !== message.id)
                        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                        .map(m => ({ author: m.author.username, content: m.content }));
                    // Get user profile and mod status
                    const userProfile = await this.database.getUserData(message.author.id, message.guild.id);
                    const isMod = message.member?.permissions?.has('ModerateMembers') || false;
                    // Channel type (simple)
                    const channelType = message.channel.name?.includes('mod') ? 'mods' : 'general';
                    // Time of day
                    const hour = new Date().getHours();
                    const timeOfDay = hour >= 22 || hour < 6 ? 'latenight' : 'day';
                    // Get server settings for personality
                    const serverSettings = await this.database.getServerSettings(message.guild.id);
                    // No delay: respond as soon as possible
                    let response = null;
                    try {
                        response = await this.personality.generateResponse(
                            { author: message.author, content: cleanedContent },
                            context,
                            channelType,
                            userProfile,
                            isMod,
                            timeOfDay,
                            2,
                            serverSettings,
                            true // forceResponse = true since Barry was explicitly called
                        );
                    } catch (err) {
                        console.error('AI response error:', err?.response?.data || err.message || err);
                    }
                    
                    if (response) {
                        response = response.replace(/\*[^*]+\*/g, '').replace(/_([^_]+)_/g, '$1').trim();
                        
                        // Only send if we have actual content
                        if (response.length > 0) {
                            // Reply to the user's message instead of just sending
                            await message.reply({
                                embeds: [{
                                    description: response,
                                    color: 0x7289da,
                                    author: {
                                        name: 'Barry',
                                        icon_url: this.client.user.displayAvatarURL()
                                    }
                                }],
                                allowedMentions: { repliedUser: false }
                            }).catch(err => console.error('Failed to send message:', err.message));
                        }
                    }
                }
            } catch (error) {
                console.error('Message handling error:', error);
            }
        });

        this.client.on('interactionCreate', async (interaction) => {
            try {
                if (interaction.isChatInputCommand()) {
                    await this.commands.handleCommand(interaction);
                }
                
                // Handle game button interactions
                if (interaction.isButton()) {
                    const customId = interaction.customId;
                    
                    // Route game-related buttons to command handler
                    if (customId.startsWith('game_') || 
                        customId.startsWith('reflex_') ||
                        customId.startsWith('timetrap_') ||
                        customId.startsWith('mindlock_') ||
                        customId.startsWith('logicgrid_') ||
                        customId.startsWith('chaosvote_') ||
                        customId.startsWith('panic_') ||
                        customId.startsWith('duel_') ||
                        customId.startsWith('daily_')) {
                        await this.commands.handleGameButton(interaction);
                    }
                    
                    // Route listwords pagination buttons
                    if (customId.startsWith('listwords_')) {
                        await this.commands.handleListWordsButton(interaction);
                    }

                    // Route pet ecosystem buttons
                    if (customId.startsWith('pet_')) {
                        await this.commands.handlePetButton(interaction);
                    }
                }
            } catch (error) {
                console.error('Interaction error:', error);
                try {
                    const content = 'Something went wrong. Please try again.';
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content, ephemeral: true });
                    } else {
                        await interaction.reply({ content, ephemeral: true });
                    }
                } catch {}
            }
        });

        this.client.on('guildMemberAdd', async (member) => {
            await this.moderation.handleMemberJoin(member);
        });

        // Auto-seed words when Barry joins a new server
        this.client.on('guildCreate', async (guild) => {
            console.log(`Joined new server: ${guild.name}`);
            try {
                await this.database.seedDefaultOffensiveWords(guild.id);
                console.log(`Seeded default words for ${guild.name}`);
            } catch (err) {
                console.error(`Failed to seed words for ${guild.name}:`, err);
            }
        });

        this.client.on('error', console.error);
    }

    async registerCommands() {
        await this.commands.registerCommands(this.client);
    }

    // Inactivity checks and reports removed

    startReminderLoop() {
        setInterval(async () => {
            const due = await Reminders.getDueReminders();
            if (!Array.isArray(due) || due.length === 0) return;
            const modChannel = this.client.channels.cache.find(ch => ch.name === 'barry-mods' && ch.type === 0);
            for (const reminder of due) {
                let dmStatus = '', channelStatus = '', errorStatus = '';
                // Prepare pretty embed for reminder
                const reminderColors = [0x2ecc71, 0xf1c40f, 0x9b59b6, 0x1abc9c, 0xe67e22, 0x3498db];
                const reminderEmojis = ['⏰', '🦄', '🌈', '✨', '🎉', '🍀', '💡', '📅'];
                const color = reminderColors[Math.floor(Math.random() * reminderColors.length)];
                const emoji = reminderEmojis[Math.floor(Math.random() * reminderEmojis.length)];
                const embed = {
                    color,
                    title: `${emoji} Reminder`,
                    description: `**${reminder.message}**`,
                    fields: [
                        { name: 'User', value: `<@${reminder.userId}>`, inline: true },
                        { name: 'Channel', value: `<#${reminder.channelId}>`, inline: true },
                        { name: 'Time', value: `<t:${Math.floor(reminder.time/1000)}:F>`, inline: true },
                        { name: 'Privacy', value: reminder.privacy || 'public', inline: true },
                        { name: 'Raw Channel ID', value: `${reminder.channelId}` },
                        { name: 'Raw User ID', value: `${reminder.userId}` }
                    ],
                    footer: { text: `Reminder ID: ${reminder.id} • Barry Bot` },
                    timestamp: new Date()
                };
                // Send DM (always)
                try {
                    const user = await this.client.users.fetch(reminder.userId);
                    if (user) {
                        await user.send({ embeds: [embed] });
                        dmStatus = '✅ DM sent';
                    } else {
                        dmStatus = '❌ DM failed (user not found)';
                        errorStatus += `DM error: user not found.`;
                    }
                } catch (err) {
                    dmStatus = '❌ DM failed';
                    errorStatus += `DM error: ${err.message || err}`;
                }
                // If public, send in channel
                if ((reminder.privacy || 'public') === 'public') {
                    try {
                        const channel = this.client.channels.cache.get(reminder.channelId);
                        if (channel) {
                            await channel.send({ content: `<@${reminder.userId}>`, embeds: [embed] });
                            channelStatus = '✅ Channel sent';
                        } else {
                            channelStatus = '❌ Channel failed (channel not found)';
                            errorStatus += ` Channel error: channel not found.`;
                        }
                    } catch (err) {
                        channelStatus = '❌ Channel failed';
                        errorStatus += ` Channel error: ${err.message || err}`;
                    }
                } else {
                    channelStatus = 'Private reminder, not sent to channel.';
                }
                // Log to #barry-mods as embed
                if (modChannel) {
                    const logColors = [0x3498db, 0xe67e22, 0x9b59b6, 0x1abc9c];
                    const logEmojis = ['📋', '🔔', '📝', '📢', '🎯'];
                    const logColor = logColors[Math.floor(Math.random() * logColors.length)];
                    const logEmoji = logEmojis[Math.floor(Math.random() * logEmojis.length)];
                    const logEmbed = {
                        color: logColor,
                        title: `${logEmoji} Reminder Delivery Log`,
                        description: `Reminder for <@${reminder.userId}>`,
                        fields: [
                            { name: 'Message', value: `**${reminder.message}**` },
                            { name: 'DM Status', value: dmStatus, inline: true },
                            { name: 'Channel Status', value: channelStatus, inline: true },
                            ...(errorStatus ? [{ name: 'Errors', value: errorStatus }] : []),
                            { name: 'Privacy', value: reminder.privacy || 'public', inline: true },
                            { name: 'Raw Channel ID', value: `${reminder.channelId}` },
                            { name: 'Raw User ID', value: `${reminder.userId}` }
                        ],
                        footer: { text: `Reminder ID: ${reminder.id} • Barry Bot` },
                        timestamp: new Date()
                    };
                    await modChannel.send({ embeds: [logEmbed] });
                }
                // Repeat or remove
                if (reminder.repeat) {
                    reminder.time_to_send = new Date(Date.now() + reminder.repeat).toISOString();
                    Reminders.updateReminder(reminder);
                } else {
                    Reminders.removeReminder(reminder.id);
                }
            }
    }, 10 * 1000); // Check every 10 second
    }

    async start() {
        try {
            await this.client.login(process.env.BOT_TOKEN);
        } catch (error) {
            console.error('Failed to start Barry:', error);
        }
    }
}



module.exports = BarryBot;