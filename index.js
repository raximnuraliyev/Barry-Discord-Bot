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
            if (message.author.bot) return;

            // Update user activity
            this.database.updateUserActivity(message.author.id, message.guild.id);

            // Check for moderation violations
            await this.moderation.checkMessage(message);

            // Handle personality responses
            if (message.mentions.has(this.client.user) || message.content.toLowerCase().includes('barry')) {
                const response = await this.personality.generateResponse(message);
                if (response) {
                    message.reply(response);
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