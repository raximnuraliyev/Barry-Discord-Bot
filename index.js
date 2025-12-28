require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
// Removed fs and path; all persistent data is now in MongoDB

// Import modules
const PersonalityHandler = require('./src/ai-personality');
const ModerationHandler = require('./src/moderation');
const DatabaseHandler = require('./src/database');
const CommandHandler = require('./src/commands');
const Reminders = require('./src/reminders');

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
        this.client.once('ready', () => {
            console.log(`Barry is online! Logged in as ${this.client.user.tag}`);
            this.client.user.setActivity('Managing the server like a boss', { type: 'WATCHING' });
            this.registerCommands();
            // Inactivity checks removed
        });

        this.client.on('messageCreate', async (message) => {
            if (message.author.bot || message.author.id === this.client.user.id) return;

            // Update user activity
            this.database.updateUserActivity(message.author.id, message.guild.id);

            // Check for moderation violations
            await this.moderation.checkMessage(message);

            // Respond if Barry is mentioned, tagged, or called by any variant/misspelling
            const barryVariants = [
                /b+a+r+y+/i,   // barry, bary, baary, etc.
                /b+e+r+r+y+/i, // berry, bery, beerry, etc.
                /b+a+r+i+e+/i, // barie, bari, bariee, etc.
                /b+a+r+i+/i,   // bari, barri, etc.
                /b+a+r+e+y+/i, // barey, etc.
                /b+a+r+e+i+/i, // barei, etc.
                /b+a+r+i+y+/i, // bariy, etc.
                /b+a+r+y+e+/i, // barye, etc.
            ];
            const isDirectMention = message.mentions.has(this.client.user);
            const isBarryText = barryVariants.some(rgx => rgx.test(message.content));
            if (isDirectMention || isBarryText) {
                // Remove the mention from the message content if present
                let cleanedContent = message.content;
                if (isDirectMention) {
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
                // No delay: respond as soon as possible
                let response = await this.personality.generateResponse(
                    { author: message.author, content: cleanedContent },
                    context,
                    channelType,
                    userProfile,
                    isMod,
                    timeOfDay
                );
                if (response) {
                    response = response.replace(/\*[^*]+\*/g, '').replace(/_([^_]+)_/g, '$1').trim();
                    message.channel.send({
                        embeds: [{
                            description: response,
                            color: 0x7289da,
                            author: {
                                name: 'Barry',
                                icon_url: this.client.user.displayAvatarURL()
                            }
                        }]
                    });
                    // Optionally: log interaction to MongoDB
                }
            }
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (interaction.isChatInputCommand()) {
                await this.commands.handleCommand(interaction);
            }
        });

        this.client.on('guildMemberAdd', async (member) => {
            await this.moderation.handleMemberJoin(member);
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

// Initialize and start Barry
const barry = new BarryBot();
barry.start();

module.exports = BarryBot;