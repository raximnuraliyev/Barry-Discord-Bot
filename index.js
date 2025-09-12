require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Import modules
const PersonalityHandler = require('./src/ai-personality');
const ModerationHandler = require('./src/moderation');
const DatabaseHandler = require('./src/database');
const CommandHandler = require('./src/commands');
const InactivityHandler = require('./src/inactivity');
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
        this.inactivity = new InactivityHandler();

        this.setupEventListeners();
    this.startReminderLoop();
    }

    setupEventListeners() {
        this.client.once('ready', () => {
            console.log(`Barry is online! Logged in as ${this.client.user.tag}`);
            this.client.user.setActivity('Managing the server like a boss', { type: 'WATCHING' });
            this.registerCommands();
            this.startInactivityChecks();
        });

        this.client.on('messageCreate', async (message) => {
            if (message.author.bot || message.author.id === this.client.user.id) return;

            // Update user activity
            this.database.updateUserActivity(message.author.id, message.guild.id);

            // Check for moderation violations
            await this.moderation.checkMessage(message);

            // Only reply if Barry is mentioned or 'barry' is in the message
            const barryRegex = /b+a+r+y+/i;
            const isDirectMention = message.mentions.has(this.client.user);
            const isBarryText = barryRegex.test(message.content);
            if (isDirectMention || isBarryText) {
                // Remove the mention from the message content if present
                let cleanedContent = message.content;
                if (isDirectMention) {
                    cleanedContent = cleanedContent.replace(new RegExp(`<@!?${this.client.user.id}>`, 'g'), '').trim();
                }
                // Prepare context for AI
                const aiPrompt = {
                    user: cleanedContent,
                    personality: this.personality.personalityData.description
                };
                // Generate AI response
                let response = await this.personality.generateAIResponse({
                    content: cleanedContent,
                    noActions: true
                });
                if (response) {
                    // Remove any action-style text (e.g., *chuckles*, *winks*, etc.)
                    response = response.replace(/\*[^*]+\*/g, '').replace(/_([^_]+)_/g, '$1').trim();
                    // Send as an embed with Barry's username and avatar
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
                    // Log the interaction
                    const logPath = path.join(__dirname, 'log.json');
                    let logs = [];
                    try {
                        logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
                    } catch {}
                    logs.push({
                        timestamp: new Date().toISOString(),
                        user: message.author.tag,
                        userMessage: cleanedContent,
                        barryReply: response
                    });
                    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
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

    startInactivityChecks() {
        // Check for inactive users every 6 hours
        setInterval(() => {
            this.inactivity.checkInactiveUsers(this.client);
        }, 6 * 60 * 60 * 1000);

        // Generate and send inactive user report every 24 hours
        setInterval(async () => {
            const inactiveList = await this.inactivity.getInactiveUsersList(this.client);
            const staffRoleId = process.env.BARRY_STAFF_ROLE_ID || null; // Set this in your .env
            const modChannel = this.client.channels.cache.find(
                ch => ch.name === 'barry-mods' && ch.type === 0 // 0 = GUILD_TEXT
            );
            if (modChannel && inactiveList && inactiveList.length > 0) {j
                // Save to inactive-users.json
                const inactivePath = path.join(__dirname, 'inactive-users.json');
                fs.writeFileSync(inactivePath, JSON.stringify(inactiveList, null, 2));
                // Build mention string for staff
                const staffMention = staffRoleId ? `<@&${staffRoleId}>` : '@here';
                // Build user list
                const userList = inactiveList.map(u => `<@${u.userId}>`).join(', ');
                // Send report
                modChannel.send({
                    content: `${staffMention} Inactive users in the last 24h: ${userList}`
                });
            }
        }, 24 * 60 * 60 * 1000);
    }

    startReminderLoop() {
        setInterval(async () => {
            const due = Reminders.getDueReminders();
            if (due.length === 0) return;
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