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