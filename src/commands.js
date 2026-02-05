const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const DatabaseHandler = require('./database');
const ModerationHandler = require('./moderation');
const PersonalityHandler = require('./ai-personality');
const GameHandler = require('./games');
const reminders = require('./reminders');

class CommandHandler {
    constructor() {
        this.database = new DatabaseHandler();
        this.moderation = new ModerationHandler();
        this.personality = new PersonalityHandler();
        this.games = new GameHandler();
        
        this.commands = [
            // ===========================================
            // AI & INTERACTION COMMANDS
            // ===========================================
            new SlashCommandBuilder()
                .setName('askbarry')
                .setDescription('Ask Barry a question')
                .addStringOption(option =>
                    option.setName('question')
                        .setDescription('Your question for Barry')
                        .setRequired(true)
                ),
            
            new SlashCommandBuilder()
                .setName('whybanned')
                .setDescription('Ask Barry why something is banned')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The word or rule to ask about')
                        .setRequired(true)
                ),

            // ===========================================
            // MODERATION COMMANDS
            // ===========================================
            new SlashCommandBuilder()
                .setName('warn')
                .setDescription('Warn a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to warn')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for the warning')
                        .setRequired(true)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            new SlashCommandBuilder()
                .setName('unwarn')
                .setDescription('Remove a warning from a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to unwarn')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('case')
                        .setDescription('Case ID to remove')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for removal')
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            new SlashCommandBuilder()
                .setName('mute')
                .setDescription('Mute/timeout a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to mute')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Duration in minutes')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for the mute')
                        .setRequired(true)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            new SlashCommandBuilder()
                .setName('unmute')
                .setDescription('Unmute a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to unmute')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for unmuting')
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            new SlashCommandBuilder()
                .setName('ban')
                .setDescription('Ban a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to ban')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for the ban')
                        .setRequired(true)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),

            new SlashCommandBuilder()
                .setName('unban')
                .setDescription('Unban a user')
                .addStringOption(option =>
                    option.setName('userid')
                        .setDescription('The user ID to unban')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for unbanning')
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),

            new SlashCommandBuilder()
                .setName('timeout')
                .setDescription('Timeout a user (alias for /mute)')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to timeout')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Duration in minutes')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for the timeout')
                        .setRequired(true)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            // ===========================================
            // CASE SYSTEM
            // ===========================================
            new SlashCommandBuilder()
                .setName('case')
                .setDescription('View a moderation case')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('Case ID to view')
                        .setRequired(true)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            new SlashCommandBuilder()
                .setName('cases')
                .setDescription('View recent cases or cases for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to view cases for (optional)')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of cases to show (default 10)')
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            // ===========================================
            // OFFENSIVE WORD MANAGEMENT
            // ===========================================
            new SlashCommandBuilder()
                .setName('addword')
                .setDescription('Add an offensive word to the filter')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The word to add')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('severity')
                        .setDescription('Severity level')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Low', value: 'low' },
                            { name: 'Medium', value: 'medium' },
                            { name: 'High', value: 'high' }
                        )
                )
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Default action')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Warn', value: 'warn' },
                            { name: 'Mute', value: 'mute' },
                            { name: 'Delete Only', value: 'delete' },
                            { name: 'Escalate', value: 'escalate' }
                        )
                )
                .addStringOption(option =>
                    option.setName('matchtype')
                        .setDescription('How to match the word')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Partial (contains)', value: 'partial' },
                            { name: 'Exact (whole word)', value: 'exact' },
                            { name: 'Regex (advanced)', value: 'regex' }
                        )
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

            new SlashCommandBuilder()
                .setName('removeword')
                .setDescription('Remove an offensive word from the filter')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The word to remove')
                        .setRequired(true)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

            new SlashCommandBuilder()
                .setName('listwords')
                .setDescription('List all filtered words')
                .addStringOption(option =>
                    option.setName('filter')
                        .setDescription('Filter words by source')
                        .setRequired(false)
                        .addChoices(
                            { name: 'All Words', value: 'all' },
                            { name: 'Default Words Only', value: 'default' },
                            { name: 'Custom Added Only', value: 'custom' }
                        )
                )
                .addIntegerOption(option =>
                    option.setName('page')
                        .setDescription('Page number')
                        .setRequired(false)
                        .setMinValue(1)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            // ===========================================
            // APPEAL SYSTEM
            // ===========================================
            new SlashCommandBuilder()
                .setName('appeal')
                .setDescription('Appeal a moderation action')
                .addStringOption(option =>
                    option.setName('case')
                        .setDescription('Case ID to appeal')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Why should this be reconsidered?')
                        .setRequired(true)
                ),

            new SlashCommandBuilder()
                .setName('appeals')
                .setDescription('View pending appeals')
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            new SlashCommandBuilder()
                .setName('reviewappeal')
                .setDescription('Approve or deny an appeal')
                .addStringOption(option =>
                    option.setName('appealid')
                        .setDescription('Appeal ID')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('decision')
                        .setDescription('Your decision')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Approve', value: 'approved' },
                            { name: 'Deny', value: 'denied' }
                        )
                )
                .addStringOption(option =>
                    option.setName('note')
                        .setDescription('Note about your decision')
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            // ===========================================
            // SERVER SETTINGS
            // ===========================================
            new SlashCommandBuilder()
                .setName('setmode')
                .setDescription('Set moderation mode (silent/strict/hybrid)')
                .addStringOption(option =>
                    option.setName('mode')
                        .setDescription('Moderation mode')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Silent (log only, no public messages)', value: 'silent' },
                            { name: 'Strict (announce all actions publicly)', value: 'strict' },
                            { name: 'Hybrid (depends on severity)', value: 'hybrid' }
                        )
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

            new SlashCommandBuilder()
                .setName('personality')
                .setDescription('Adjust Barry\'s personality settings')
                .addIntegerOption(option =>
                    option.setName('humor')
                        .setDescription('Humor level (0-10)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(10)
                )
                .addIntegerOption(option =>
                    option.setName('strictness')
                        .setDescription('Strictness level (0-10)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(10)
                )
                .addIntegerOption(option =>
                    option.setName('verbosity')
                        .setDescription('Response length (0-10)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(10)
                )
                .addIntegerOption(option =>
                    option.setName('responsechance')
                        .setDescription('Chance to respond to mentions (0-100%)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(100)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

            // ===========================================
            // USER INFO & REPORTS
            // ===========================================
            new SlashCommandBuilder()
                .setName('report')
                .setDescription('View a user\'s moderation history')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to check')
                        .setRequired(true)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            new SlashCommandBuilder()
                .setName('note')
                .setDescription('Add a private note about a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to note')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('note')
                        .setDescription('The note to add')
                        .setRequired(true)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            new SlashCommandBuilder()
                .setName('serverstats')
                .setDescription('View server statistics')
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            new SlashCommandBuilder()
                .setName('auditlog')
                .setDescription('View Barry\'s audit log')
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of entries to show')
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            // ===========================================
            // ALERT SYSTEM
            // ===========================================
            new SlashCommandBuilder()
                .setName('alert')
                .setDescription('Send an alert about rule-adjacent behavior')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for the alert')
                        .setRequired(true)
                ),

            // ===========================================
            // REMINDER COMMANDS
            // ===========================================
            new SlashCommandBuilder()
                .setName('remindme')
                .setDescription('Set a reminder')
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('Time interval (e.g., 10m, 2h, 1d)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Reminder message')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('repeat')
                        .setDescription('Repeat interval (e.g., every day, every 8h)')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('privacy')
                        .setDescription('Privacy: public or private')
                        .setRequired(false)
                ),
            new SlashCommandBuilder()
                .setName('reminders')
                .setDescription('List, edit, or cancel your reminders')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action: list, cancel, edit, snooze')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('Reminder ID (for cancel/edit/snooze)')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('New time/message for edit/snooze')
                        .setRequired(false)
                ),

            // ===========================================
            // ACTIVE USERS - Immune to auto-moderation
            // ===========================================
            new SlashCommandBuilder()
                .setName('activeuser')
                .setDescription('Manage users immune to auto-moderation')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a user to the active users list')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to add')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option.setName('reason')
                                .setDescription('Reason for adding')
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove a user from the active users list')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to remove')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('List all active users')
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            // ===========================================
            // MODERATION LISTS
            // ===========================================
            new SlashCommandBuilder()
                .setName('warns')
                .setDescription('View all warnings in the server')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Filter by user (optional)')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('page')
                        .setDescription('Page number')
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            new SlashCommandBuilder()
                .setName('bans')
                .setDescription('View all bans in the server')
                .addIntegerOption(option =>
                    option.setName('page')
                        .setDescription('Page number')
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            new SlashCommandBuilder()
                .setName('mutes')
                .setDescription('View all mutes/timeouts in the server')
                .addBooleanOption(option =>
                    option.setName('active')
                        .setDescription('Show only currently active mutes')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('page')
                        .setDescription('Page number')
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            // ===========================================
            // GAME COMMANDS
            // ===========================================
            new SlashCommandBuilder()
                .setName('game')
                .setDescription('Start a game')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Game type')
                        .setRequired(true)
                        .addChoices(
                            { name: '⚡ Reflex Roulette - Test your reaction speed', value: 'reflex' },
                            { name: '🧠 Mind Lock - Pattern memory challenge', value: 'mindlock' },
                            { name: '🎭 Bluff or Bust - Spot the fake answer', value: 'bluff' },
                            { name: '⏱️ Time Trap - Hit exactly 5.00 seconds', value: 'timetrap' },
                            { name: '📚 Word Heist - Category word chain', value: 'wordheist' },
                            { name: '🗳️ Chaos Vote - Vote for players', value: 'chaosvote' },
                            { name: '🚨 Button Panic - Don\'t click the traps', value: 'buttonpanic' },
                            { name: '🧩 Logic Grid - Solve the puzzle', value: 'logicgrid' }
                        )
                )
                .addIntegerOption(option =>
                    option.setName('players')
                        .setDescription('Max players (default: 10)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(20)
                ),

            new SlashCommandBuilder()
                .setName('duel')
                .setDescription('Challenge someone to a duel')
                .addUserOption(option =>
                    option.setName('opponent')
                        .setDescription('Who to challenge')
                        .setRequired(true)
                ),

            new SlashCommandBuilder()
                .setName('daily')
                .setDescription('Play today\'s daily challenge'),

            // Removed /leaderboard - use /ranks instead

            new SlashCommandBuilder()
                .setName('achievements')
                .setDescription('View your achievements')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to view (default: yourself)')
                        .setRequired(false)
                ),

            new SlashCommandBuilder()
                .setName('gamestats')
                .setDescription('View your game statistics')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to view (default: yourself)')
                        .setRequired(false)
                ),

            new SlashCommandBuilder()
                .setName('rank')
                .setDescription('View your game rank on this server')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to view (default: yourself)')
                        .setRequired(false)
                ),

            new SlashCommandBuilder()
                .setName('ranks')
                .setDescription('View the server rankings with pagination')
                .addStringOption(option =>
                    option.setName('game')
                        .setDescription('Filter by game type')
                        .setRequired(false)
                        .addChoices(
                            { name: 'All Games', value: 'all' },
                            { name: '⚡ Reflex Roulette', value: 'reflex' },
                            { name: '🧠 Mind Lock', value: 'mindlock' },
                            { name: '⏱️ Time Trap', value: 'timetrap' },
                            { name: '🎭 Bluff or Bust', value: 'bluff' },
                            { name: '📚 Word Heist', value: 'wordheist' },
                            { name: '🗳️ Chaos Vote', value: 'chaosvote' },
                            { name: '🚨 Button Panic', value: 'buttonpanic' },
                            { name: '🤠 Duel Draw', value: 'dueldraw' },
                            { name: '🧩 Logic Grid', value: 'logicgrid' }
                        )
                )
                .addIntegerOption(option =>
                    option.setName('page')
                        .setDescription('Page number')
                        .setRequired(false)
                        .setMinValue(1)
                ),

            // ===========================================
            // DOCUMENTATION
            // ===========================================
            new SlashCommandBuilder()
                .setName('help')
                .setDescription('View all commands and how to use them'),

            new SlashCommandBuilder()
                .setName('mod-help')
                .setDescription('View all moderator commands (Mods only)')
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            // ===========================================
            // MOD DM NOTIFICATIONS
            // ===========================================
            new SlashCommandBuilder()
                .setName('mod-dm')
                .setDescription('Toggle DM notifications for moderation events')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Enable or disable DM notifications')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Enable', value: 'on' },
                            { name: 'Disable', value: 'off' },
                            { name: 'Status', value: 'status' }
                        )
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

            new SlashCommandBuilder()
                .setName('set-mod-channel')
                .setDescription('Set the channel for moderation logs')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to send mod logs to')
                        .setRequired(true)
                )
                .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
        ];
    }

    async registerCommands(client) {
        try {
            console.log('Registering slash commands...');
            await client.application.commands.set(this.commands);
            console.log('Successfully registered slash commands!');
        } catch (error) {
            console.error('Failed to register commands:', error);
        }
    }

    async handleCommand(interaction) {
        const { commandName } = interaction;

        try {
            switch (commandName) {
                // AI Commands
                case 'askbarry': return await this.handleAskBarry(interaction);
                case 'whybanned': return await this.handleWhyBanned(interaction);
                
                // Moderation
                case 'warn': return await this.handleWarn(interaction);
                case 'unwarn': return await this.handleUnwarn(interaction);
                case 'mute':
                case 'timeout': return await this.handleMute(interaction);
                case 'unmute': return await this.handleUnmute(interaction);
                case 'ban': return await this.handleBan(interaction);
                case 'unban': return await this.handleUnban(interaction);
                
                // Cases
                case 'case': return await this.handleCase(interaction);
                case 'cases': return await this.handleCases(interaction);
                
                // Word management
                case 'addword': return await this.handleAddWord(interaction);
                case 'removeword': return await this.handleRemoveWord(interaction);
                case 'listwords': return await this.handleListWords(interaction);
                
                // Appeals
                case 'appeal': return await this.handleAppeal(interaction);
                case 'appeals': return await this.handleAppeals(interaction);
                case 'reviewappeal': return await this.handleReviewAppeal(interaction);
                
                // Settings
                case 'setmode': return await this.handleSetMode(interaction);
                case 'personality': return await this.handlePersonality(interaction);
                
                // Reports
                case 'report': return await this.handleReport(interaction);
                case 'note': return await this.handleNote(interaction);
                case 'serverstats': return await this.handleServerStats(interaction);
                case 'auditlog': return await this.handleAuditLog(interaction);
                
                // Alert
                case 'alert': return await this.handleAlert(interaction);
                
                // Reminders
                case 'remindme': return await this.handleRemindMe(interaction);
                case 'reminders': return await this.handleReminders(interaction);
                
                // Active Users & Moderation Lists
                case 'activeuser': return await this.handleActiveUser(interaction);
                case 'warns': return await this.handleWarns(interaction);
                case 'bans': return await this.handleBans(interaction);
                case 'mutes': return await this.handleMutes(interaction);
                
                // Games
                case 'game': return await this.handleGame(interaction);
                case 'duel': return await this.handleDuel(interaction);
                case 'daily': return await this.handleDaily(interaction);
                // leaderboard removed - use /ranks
                case 'achievements': return await this.handleAchievements(interaction);
                case 'gamestats': return await this.handleGameStats(interaction);
                case 'rank': return await this.handleRank(interaction);
                case 'ranks': return await this.handleRanks(interaction);
                
                // Documentation
                case 'help': return await this.handleHelp(interaction);
                case 'mod-help': return await this.handleModHelp(interaction);
                
                // Mod DM & Channel Settings
                case 'mod-dm': return await this.handleModDm(interaction);
                case 'set-mod-channel': return await this.handleSetModChannel(interaction);
                
                default:
                    await interaction.reply({ content: 'Unknown command.', ephemeral: true });
            }
        } catch (error) {
            console.error('Command error:', error);
            // Don't try to respond if it's an interaction timeout error
            if (error.code === 10062 || error.code === 40060) {
                console.log('Interaction expired or already acknowledged, skipping error response');
                return;
            }
            try {
                const reply = { content: `Something went wrong. Please try again.`, ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply).catch(() => {});
                } else {
                    await interaction.reply(reply).catch(() => {});
                }
            } catch (e) {
                // Completely failed to respond, just log
                console.error('Failed to send error response:', e.message);
            }
        }
    }

    // ===========================================
    // AI COMMANDS
    // ===========================================

    async handleAskBarry(interaction) {
        try {
            await interaction.deferReply();
        } catch (error) {
            if (error.code === 10062) {
                console.log('Interaction expired before defer in askbarry');
                return;
            }
            throw error;
        }
        
        const question = interaction.options.getString('question');
        
        let settings, userProfile;
        try {
            settings = await this.database.getServerSettings(interaction.guild.id);
            userProfile = await this.database.getUserData(interaction.user.id, interaction.guild.id);
        } catch (err) {
            console.error('Error fetching settings:', err);
            settings = {};
            userProfile = {};
        }
        
        let context = [];
        try {
            const channelMessages = await interaction.channel.messages.fetch({ limit: 8 });
            context = Array.from(channelMessages.values())
                .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                .map(m => ({ author: m.author.username, content: m.content }));
        } catch {}

        const isMod = interaction.member?.permissions?.has(PermissionsBitField.Flags.ModerateMembers);
        const hour = new Date().getHours();
        const timeOfDay = hour >= 22 || hour < 6 ? 'latenight' : 'day';

        let response;
        try {
            response = await this.personality.generateResponse(
                { author: interaction.user, content: question },
                context,
                'general',
                userProfile,
                isMod,
                timeOfDay,
                2,
                settings
            );
        } catch (err) {
            console.error('AI response error:', err);
        }

        if (!response || response.trim() === '') {
            response = "Hmm, I'm not sure how to answer that. Try asking differently.";
        }

        const embed = new EmbedBuilder()
            .setColor(0x2d3136)
            .setTitle('Barry says:')
            .setDescription(response)
            .setFooter({ text: 'Ask Barry anything. He might answer.' });

        await interaction.editReply({ embeds: [embed] });
    }

    async handleWhyBanned(interaction) {
        try {
            await interaction.deferReply();
        } catch (error) {
            if (error.code === 10062) {
                console.log('Interaction expired before defer in whybanned');
                return;
            }
            throw error;
        }
        
        const word = interaction.options.getString('word');
        const settings = await this.database.getServerSettings(interaction.guild.id);
        
        let explanation;
        try {
            explanation = await this.personality.generateRuleExplanation(word, '', settings);
        } catch (err) {
            console.error('AI explanation error:', err);
        }
        
        if (!explanation || explanation.trim() === '') {
            explanation = `The word "${word}" may be filtered because it could be offensive, inappropriate, or violate community guidelines. If you believe this is a mistake, contact a moderator.`;
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`Why is "${word}" not allowed?`)
            .setDescription(explanation)
            .setFooter({ text: 'Barry explains the rules' });

        await interaction.editReply({ embeds: [embed] });
    }

    // ===========================================
    // MODERATION COMMANDS
    // ===========================================

    async handleWarn(interaction) {
        // Defer immediately to avoid timeout
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        
        const result = await this.moderation.manualWarn(
            interaction.guild,
            interaction.user,
            user,
            reason
        );

        const embed = new EmbedBuilder()
            .setColor(0xFFFF00)
            .setTitle('User Warned')
            .setDescription(`${user.tag} has been warned.`)
            .addFields(
                { name: 'Reason', value: reason, inline: false },
                { name: 'Case', value: `#${result.case.caseId}`, inline: true },
                { name: 'Moderator', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }

    async handleUnwarn(interaction) {
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user');
        const caseId = interaction.options.getString('case');
        const reason = interaction.options.getString('reason');

        const result = await this.moderation.manualUnwarn(
            interaction.guild,
            interaction.user,
            user,
            caseId,
            reason
        );

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Warning Removed')
            .setDescription(`Removed warning case #${caseId} from ${user.tag}`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }

    async handleMute(interaction) {
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user');
        const duration = interaction.options.getInteger('duration') * 60 * 1000;
        const reason = interaction.options.getString('reason');
        const member = interaction.guild.members.cache.get(user.id);

        if (!member) {
            return await interaction.editReply({ content: 'User not found in server.' });
        }

        const result = await this.moderation.manualMute(
            interaction.guild,
            member,
            interaction.user,
            duration,
            reason
        );

        const embed = new EmbedBuilder()
            .setColor(0xFF8C00)
            .setTitle('User Muted')
            .setDescription(`${user.tag} has been muted.`)
            .addFields(
                { name: 'Duration', value: this.formatDuration(duration), inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Case', value: `#${result.case.caseId}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }

    async handleUnmute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const member = interaction.guild.members.cache.get(user.id);

        if (!member) {
            return await interaction.reply({ content: 'User not found in server.', ephemeral: true });
        }

        const result = await this.moderation.manualUnmute(
            interaction.guild,
            member,
            interaction.user,
            reason
        );

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('User Unmuted')
            .setDescription(`${user.tag} has been unmuted.`)
            .addFields({ name: 'Case', value: `#${result.caseId}`, inline: true })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async handleBan(interaction) {
        // Defer immediately to prevent timeout
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        try {
            const result = await this.moderation.manualBan(
                interaction.guild,
                user,
                interaction.user,
                reason
            );

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('User Banned')
                .setDescription(`${user.tag} has been banned.`)
                .addFields(
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Case', value: `#${result.case.caseId}`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Ban error:', error);
            await interaction.editReply({ content: `Failed to ban user: ${error.message}` });
        }
    }

    async handleUnban(interaction) {
        const userId = interaction.options.getString('userid');
        const reason = interaction.options.getString('reason');

        const result = await this.moderation.manualUnban(
            interaction.guild,
            userId,
            interaction.user,
            reason
        );

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('User Unbanned')
            .setDescription(`User ${userId} has been unbanned.`)
            .addFields({ name: 'Case', value: `#${result.caseId}`, inline: true })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // ===========================================
    // CASE COMMANDS
    // ===========================================

    async handleCase(interaction) {
        const caseId = interaction.options.getString('id');
        const modCase = await this.database.getCase(interaction.guild.id, caseId);

        if (!modCase) {
            return await interaction.reply({ content: `Case #${caseId} not found.`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(this.getActionColor(modCase.action))
            .setTitle(`Case #${modCase.caseId}`)
            .addFields(
                { name: 'Action', value: modCase.action.toUpperCase(), inline: true },
                { name: 'User', value: `<@${modCase.userId}>`, inline: true },
                { name: 'Moderator', value: modCase.moderator, inline: true },
                { name: 'Severity', value: modCase.severity || 'N/A', inline: true },
                { name: 'Score', value: `${modCase.severityScore || 'N/A'}/100`, inline: true },
                { name: 'Automated', value: modCase.automated ? 'Yes' : 'No', inline: true },
                { name: 'Reason', value: modCase.reason || 'No reason provided', inline: false }
            )
            .setTimestamp(modCase.timestamp);

        if (modCase.aiExplanation) {
            embed.addFields({ name: 'AI Explanation', value: modCase.aiExplanation.substring(0, 1000), inline: false });
        }

        if (modCase.messageContent) {
            embed.addFields({ name: 'Message', value: `\`\`\`${modCase.messageContent.substring(0, 500)}\`\`\``, inline: false });
        }

        if (modCase.appealStatus !== 'none') {
            embed.addFields({ name: 'Appeal Status', value: modCase.appealStatus, inline: true });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleCases(interaction) {
        const user = interaction.options.getUser('user');
        const page = interaction.options.getInteger('page') || 1;
        const perPage = 10;

        let cases;
        let title;

        if (user) {
            cases = await this.database.getUserCases(user.id, interaction.guild.id);
            title = `Cases for ${user.tag}`;
        } else {
            cases = await this.database.getRecentCases(interaction.guild.id, 100);
            title = 'Recent Cases';
        }

        if (!cases || cases.length === 0) {
            return await interaction.reply({ content: 'No cases found.', ephemeral: true });
        }

        const totalPages = Math.ceil(cases.length / perPage);
        const startIdx = (page - 1) * perPage;
        const pageCases = cases.slice(startIdx, startIdx + perPage);

        const caseList = pageCases.map(c => 
            `**#${c.caseId}** | ${c.action.toUpperCase()} | <@${c.userId}> | ${c.reason?.substring(0, 50) || 'No reason'}...`
        ).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(title)
            .setDescription(caseList)
            .setFooter({ text: `Page ${page}/${totalPages} • ${cases.length} total cases` })
            .setTimestamp();

        // Pagination buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`cases_prev_${user?.id || 'all'}_${page}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page <= 1),
                new ButtonBuilder()
                    .setCustomId(`cases_page_${user?.id || 'all'}_${page}`)
                    .setLabel(`${page}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`cases_next_${user?.id || 'all'}_${page}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPages)
            );

        await interaction.reply({ embeds: [embed], components: totalPages > 1 ? [row] : [], ephemeral: true });
    }

    // ===========================================
    // WORD MANAGEMENT COMMANDS
    // ===========================================

    async handleAddWord(interaction) {
        const word = interaction.options.getString('word');
        const severity = interaction.options.getString('severity') || 'medium';
        const action = interaction.options.getString('action') || 'warn';
        const matchType = interaction.options.getString('matchtype') || 'partial';

        await this.database.addOffensiveWord(interaction.guild.id, word, {
            matchType,
            severity,
            defaultAction: action,
            addedBy: interaction.user.tag
        });

        // Clear cache so new word takes effect
        this.moderation.clearCache(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Word Added')
            .setDescription(`Added "${word}" to the filter.`)
            .addFields(
                { name: 'Severity', value: severity, inline: true },
                { name: 'Action', value: action, inline: true },
                { name: 'Match Type', value: matchType, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleRemoveWord(interaction) {
        const word = interaction.options.getString('word');
        const removed = await this.database.removeOffensiveWord(interaction.guild.id, word);

        // Clear cache
        this.moderation.clearCache(interaction.guild.id);

        if (removed) {
            await interaction.reply({ content: `Removed "${word}" from the filter.`, ephemeral: true });
        } else {
            await interaction.reply({ content: `"${word}" was not in the filter.`, ephemeral: true });
        }
    }

    async handleListWords(interaction) {
        const filter = interaction.options.getString('filter') || 'all';
        const page = interaction.options.getInteger('page') || 1;
        const perPage = 15;

        let words = await this.database.getOffensiveWords(interaction.guild.id);

        if (!words || words.length === 0) {
            return await interaction.reply({ content: 'No filtered words configured.', ephemeral: true });
        }

        // Filter words based on selection
        if (filter === 'default') {
            words = words.filter(w => !w.addedBy || w.addedBy === 'system');
        } else if (filter === 'custom') {
            words = words.filter(w => w.addedBy && w.addedBy !== 'system');
        }

        if (words.length === 0) {
            return await interaction.reply({ content: `No ${filter} words found.`, ephemeral: true });
        }

        const totalPages = Math.ceil(words.length / perPage);
        const currentPage = Math.min(page, totalPages);
        const start = (currentPage - 1) * perPage;
        const pageWords = words.slice(start, start + perPage);

        const wordList = pageWords.map((w, i) => {
            const source = (!w.addedBy || w.addedBy === 'system') ? '📦' : '✏️';
            const severityIcon = w.severity === 'high' ? '🔴' : w.severity === 'medium' ? '🟡' : '🟢';
            return `${source} ||${w.word}|| ${severityIcon} ${w.defaultAction}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📝 Filtered Words')
            .setDescription(`**Legend:** 📦 Default | ✏️ Custom | 🔴 High | 🟡 Medium | 🟢 Low\n\n${wordList}`)
            .addFields(
                { name: 'Filter', value: filter.charAt(0).toUpperCase() + filter.slice(1), inline: true },
                { name: 'Total Words', value: `${words.length}`, inline: true },
                { name: 'Page', value: `${currentPage}/${totalPages}`, inline: true }
            )
            .setFooter({ text: `Page ${currentPage} of ${totalPages}` })
            .setTimestamp();

        // Create pagination buttons
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`listwords_prev_${filter}_${currentPage}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage <= 1),
                new ButtonBuilder()
                    .setCustomId(`listwords_page_${filter}_${currentPage}`)
                    .setLabel(`${currentPage}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`listwords_next_${filter}_${currentPage}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // Handle listwords pagination button clicks
    async handleListWordsButton(interaction) {
        const parts = interaction.customId.split('_');
        const action = parts[1]; // prev or next
        const filter = parts[2]; // all, default, or custom
        const currentPage = parseInt(parts[3]);
        const perPage = 15;

        let newPage = currentPage;
        if (action === 'prev') newPage = currentPage - 1;
        if (action === 'next') newPage = currentPage + 1;

        let words = await this.database.getOffensiveWords(interaction.guild.id);

        if (!words || words.length === 0) {
            return await interaction.update({ content: 'No filtered words configured.', embeds: [], components: [] });
        }

        // Filter words based on selection
        if (filter === 'default') {
            words = words.filter(w => !w.addedBy || w.addedBy === 'system');
        } else if (filter === 'custom') {
            words = words.filter(w => w.addedBy && w.addedBy !== 'system');
        }

        const totalPages = Math.ceil(words.length / perPage);
        newPage = Math.max(1, Math.min(newPage, totalPages));
        const start = (newPage - 1) * perPage;
        const pageWords = words.slice(start, start + perPage);

        const wordList = pageWords.map((w, i) => {
            const source = (!w.addedBy || w.addedBy === 'system') ? '📦' : '✏️';
            const severityIcon = w.severity === 'high' ? '🔴' : w.severity === 'medium' ? '🟡' : '🟢';
            return `${source} ||${w.word}|| ${severityIcon} ${w.defaultAction}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📝 Filtered Words')
            .setDescription(`**Legend:** 📦 Default | ✏️ Custom | 🔴 High | 🟡 Medium | 🟢 Low\n\n${wordList}`)
            .addFields(
                { name: 'Filter', value: filter.charAt(0).toUpperCase() + filter.slice(1), inline: true },
                { name: 'Total Words', value: `${words.length}`, inline: true },
                { name: 'Page', value: `${newPage}/${totalPages}`, inline: true }
            )
            .setFooter({ text: `Page ${newPage} of ${totalPages}` })
            .setTimestamp();

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`listwords_prev_${filter}_${newPage}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(newPage <= 1),
                new ButtonBuilder()
                    .setCustomId(`listwords_page_${filter}_${newPage}`)
                    .setLabel(`${newPage}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`listwords_next_${filter}_${newPage}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(newPage >= totalPages)
            );

        await interaction.update({ embeds: [embed], components: [row] });
    }

    // ===========================================
    // APPEAL COMMANDS
    // ===========================================

    async handleAppeal(interaction) {
        const caseId = interaction.options.getString('case');
        const reason = interaction.options.getString('reason');

        const modCase = await this.database.getCase(interaction.guild.id, caseId);
        if (!modCase) {
            return await interaction.reply({ content: `Case #${caseId} not found.`, ephemeral: true });
        }

        if (modCase.userId !== interaction.user.id) {
            return await interaction.reply({ content: 'You can only appeal your own cases.', ephemeral: true });
        }

        const settings = await this.database.getServerSettings(interaction.guild.id);
        if (settings.features && !settings.features.appealSystem) {
            return await interaction.reply({ content: 'Appeals are not enabled on this server.', ephemeral: true });
        }

        // Get AI summary
        const userProfile = await this.database.getUserData(interaction.user.id, interaction.guild.id);
        const aiSummary = await this.personality.summarizeAppeal(
            { reason },
            modCase,
            userProfile.warnings || []
        );

        const appeal = await this.database.createAppeal({
            guildId: interaction.guild.id,
            userId: interaction.user.id,
            caseId,
            reason,
            aiSummary
        });

        // Notify mod channel
        const modChannel = await this.moderation.getModChannel(interaction.guild);
        if (modChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('New Appeal')
                .addFields(
                    { name: 'Appeal ID', value: appeal.appealId, inline: true },
                    { name: 'Case', value: `#${caseId}`, inline: true },
                    { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'AI Summary', value: aiSummary.substring(0, 1000), inline: false }
                )
                .setTimestamp();

            await modChannel.send({ embeds: [embed] });
        }

        await interaction.reply({ 
            content: `Your appeal has been submitted. Appeal ID: ${appeal.appealId}`, 
            ephemeral: true 
        });
    }

    async handleAppeals(interaction) {
        const appeals = await this.database.getPendingAppeals(interaction.guild.id);

        if (!appeals || appeals.length === 0) {
            return await interaction.reply({ content: 'No pending appeals.', ephemeral: true });
        }

        const appealList = appeals.map(a => 
            `**${a.appealId}** | Case #${a.caseId} | <@${a.userId}> | ${a.reason.substring(0, 50)}...`
        ).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('Pending Appeals')
            .setDescription(appealList)
            .setFooter({ text: `${appeals.length} pending appeals` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleReviewAppeal(interaction) {
        const appealId = interaction.options.getString('appealid');
        const decision = interaction.options.getString('decision');
        const note = interaction.options.getString('note');

        const appeal = await this.database.getAppeal(appealId);
        if (!appeal) {
            return await interaction.reply({ content: 'Appeal not found.', ephemeral: true });
        }

        await this.database.updateAppeal(appealId, {
            status: decision,
            reviewedBy: interaction.user.tag,
            reviewedById: interaction.user.id,
            reviewedAt: new Date(),
            reviewNote: note
        });

        // Update the original case
        await this.database.updateCase(interaction.guild.id, appeal.caseId, {
            appealStatus: decision,
            appealReviewedBy: interaction.user.tag,
            appealReviewedAt: new Date()
        });

        // If approved, reverse the action
        if (decision === 'approved') {
            const modCase = await this.database.getCase(interaction.guild.id, appeal.caseId);
            if (modCase && (modCase.action === 'mute' || modCase.action === 'timeout')) {
                const member = interaction.guild.members.cache.get(appeal.userId);
                if (member) {
                    try {
                        await member.timeout(null);
                        await this.database.unmuteUser(appeal.userId, interaction.guild.id);
                    } catch {}
                }
            }
        }

        // Notify user
        try {
            const user = await interaction.client.users.fetch(appeal.userId);
            await user.send({
                embeds: [{
                    color: decision === 'approved' ? 0x00FF00 : 0xFF0000,
                    title: `Appeal ${decision.charAt(0).toUpperCase() + decision.slice(1)}`,
                    description: `Your appeal for case #${appeal.caseId} has been ${decision}.${note ? `\n\nNote: ${note}` : ''}`
                }]
            });
        } catch {}

        await interaction.reply({ 
            content: `Appeal ${appealId} has been ${decision}.`, 
            ephemeral: true 
        });
    }

    // ===========================================
    // SETTINGS COMMANDS
    // ===========================================

    async handleSetMode(interaction) {
        const mode = interaction.options.getString('mode');
        await this.database.setModerationMode(interaction.guild.id, mode);

        const descriptions = {
            silent: 'Barry will log actions privately but not post public messages.',
            strict: 'Barry will announce all moderation actions publicly.',
            hybrid: 'Barry will decide based on severity (low=silent, high=public).'
        };

        await interaction.reply({ 
            content: `Moderation mode set to **${mode}**.\n${descriptions[mode]}`, 
            ephemeral: true 
        });
    }

    async handlePersonality(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
        } catch (error) {
            if (error.code === 10062) {
                console.log('Interaction expired before defer in personality');
                return;
            }
            throw error;
        }
        
        const humor = interaction.options.getInteger('humor');
        const strictness = interaction.options.getInteger('strictness');
        const verbosity = interaction.options.getInteger('verbosity');
        const responseChance = interaction.options.getInteger('responsechance');

        const settings = await this.database.getServerSettings(interaction.guild.id);
        const personality = settings.personalitySettings || {
            humorLevel: 5,
            strictnessLevel: 5,
            verbosityLevel: 5,
            responseChance: 80
        };

        // Only update if value was actually provided (not null/undefined)
        if (humor !== null && humor !== undefined) personality.humorLevel = humor;
        if (strictness !== null && strictness !== undefined) personality.strictnessLevel = strictness;
        if (verbosity !== null && verbosity !== undefined) personality.verbosityLevel = verbosity;
        if (responseChance !== null && responseChance !== undefined) personality.responseChance = responseChance;

        await this.database.updatePersonalitySettings(interaction.guild.id, personality);

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('Barry\'s Personality Updated')
            .setDescription(`Settings for **${interaction.guild.name}**`)
            .addFields(
                { name: 'Humor', value: `${'█'.repeat(personality.humorLevel || 5)}${'░'.repeat(10 - (personality.humorLevel || 5))} ${personality.humorLevel || 5}/10`, inline: false },
                { name: 'Strictness', value: `${'█'.repeat(personality.strictnessLevel || 5)}${'░'.repeat(10 - (personality.strictnessLevel || 5))} ${personality.strictnessLevel || 5}/10`, inline: false },
                { name: 'Verbosity', value: `${'█'.repeat(personality.verbosityLevel || 5)}${'░'.repeat(10 - (personality.verbosityLevel || 5))} ${personality.verbosityLevel || 5}/10`, inline: false },
                { name: 'Response Chance', value: `${personality.responseChance || 80}%`, inline: false }
            )
            .setFooter({ text: 'These settings are unique to this server' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }

    // ===========================================
    // REPORT COMMANDS
    // ===========================================

    async handleReport(interaction) {
        const user = interaction.options.getUser('user');
        const userData = await this.database.getUserData(user.id, interaction.guild.id);
        const cases = await this.database.getUserCases(user.id, interaction.guild.id);
        const notes = await this.database.getUserNotes(user.id, interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`Report for ${user.tag}`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: 'User ID', value: user.id, inline: true },
                { name: 'Trust Level', value: `${userData.trustLevel || 0}`, inline: true },
                { name: 'Total Warnings', value: `${(userData.warnings || []).length}`, inline: true },
                { name: 'Total Cases', value: `${cases?.length || 0}`, inline: true },
                { name: 'Notes', value: `${notes?.length || 0}`, inline: true },
                { name: 'Last Activity', value: userData.lastActivity ? `<t:${Math.floor(new Date(userData.lastActivity).getTime() / 1000)}:R>` : 'Never', inline: true }
            )
            .setTimestamp();

        if (cases && cases.length > 0) {
            const recentCases = cases.slice(0, 5).map(c => 
                `#${c.caseId}: ${c.action} - ${c.reason?.substring(0, 30) || 'No reason'}...`
            ).join('\n');
            embed.addFields({ name: 'Recent Cases', value: recentCases, inline: false });
        }

        if (notes && notes.length > 0) {
            const recentNotes = notes.slice(0, 3).map(n => 
                `${n.moderator}: ${n.note.substring(0, 50)}...`
            ).join('\n');
            embed.addFields({ name: 'Recent Notes', value: recentNotes, inline: false });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleNote(interaction) {
        const user = interaction.options.getUser('user');
        const note = interaction.options.getString('note');
        
        await this.database.addNote(user.id, interaction.guild.id, note, interaction.user.tag, interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Note Added')
            .setDescription(`Added note for ${user.tag}: "${note}"`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleServerStats(interaction) {
        const stats = await this.database.getServerStats(interaction.guild.id);
        const guild = interaction.guild;
        const safe = (v) => (typeof v === 'number' && !isNaN(v) ? v.toString() : '0');

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`Server Statistics for ${guild.name}`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: 'Total Members', value: safe(guild.memberCount), inline: true },
                { name: 'Tracked Users', value: safe(stats?.totalUsers), inline: true },
                { name: 'Pending Appeals', value: safe(stats?.pendingAppeals), inline: true },
                { name: 'Actions Today', value: safe(stats?.actionsToday), inline: true },
                { name: 'Actions This Week', value: safe(stats?.actionsThisWeek), inline: true },
                { name: 'Bans This Week', value: safe(stats?.bansThisWeek), inline: true },
                { name: 'Mutes This Week', value: safe(stats?.mutesThisWeek), inline: true },
                { name: 'Warnings This Week', value: safe(stats?.warningsThisWeek), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleAuditLog(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
        } catch (error) {
            if (error.code === 10062) {
                console.log('Interaction expired before defer in auditlog');
                return;
            }
            throw error;
        }
        
        const page = interaction.options.getInteger('page') || 1;
        const perPage = 10;
        const logs = await this.database.getAuditLog(interaction.guild.id, 100);

        if (!logs || logs.length === 0) {
            return await interaction.editReply({ content: 'No audit log entries found for this server.' });
        }

        const actionIcons = {
            'warn': '⚠️',
            'mute': '🔇',
            'unmute': '🔊',
            'ban': '🔨',
            'unban': '🔓',
            'kick': '👢',
            'timeout': '⏱️',
            'delete': '🗑️',
            'addword': '➕',
            'removeword': '➖',
            'settings': '⚙️',
            'appeal': '📝',
            'default': '📋'
        };

        const totalPages = Math.ceil(logs.length / perPage);
        const startIdx = (page - 1) * perPage;
        const pageLogs = logs.slice(startIdx, startIdx + perPage);

        const logEntries = pageLogs.map(l => {
            const icon = actionIcons[l.actionType?.toLowerCase()] || actionIcons['default'];
            const time = `<t:${Math.floor(new Date(l.timestamp).getTime() / 1000)}:R>`;
            const target = l.targetUserId ? `<@${l.targetUserId}>` : '';
            const performer = l.performedBy || 'Barry (Auto)';
            const details = l.details ? ` - ${l.details.substring(0, 50)}` : '';
            return `${icon} **${l.actionType?.toUpperCase() || 'ACTION'}** ${time}\n   By: ${performer} ${target ? `| Target: ${target}` : ''}${details}`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(0x2F3136)
            .setTitle(`📜 Audit Log - ${interaction.guild.name}`)
            .setDescription(logEntries || 'No entries')
            .addFields(
                { name: 'Server ID', value: interaction.guild.id, inline: true },
                { name: 'Page', value: `${page}/${totalPages}`, inline: true },
                { name: 'Total', value: `${logs.length}`, inline: true }
            )
            .setFooter({ text: 'Barry Bot Audit Log • Actions are server-specific' })
            .setTimestamp();

        // Pagination buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`auditlog_prev_${page}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page <= 1),
                new ButtonBuilder()
                    .setCustomId(`auditlog_page_${page}`)
                    .setLabel(`${page}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`auditlog_next_${page}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPages)
            );

        await interaction.editReply({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
    }

    // ===========================================
    // ALERT COMMAND
    // ===========================================

    async handleAlert(interaction) {
        const reason = interaction.options.getString('reason');
        const guild = interaction.guild;
        
        const modChannel = await this.moderation.getModChannel(guild);
        
        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('Alert: Community Behavior')
            .setDescription(`**${reason}**\n\nPlease review and discuss if this needs action.`)
            .addFields(
                { name: 'Reported By', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true }
            )
            .setTimestamp();

        if (modChannel) {
            await modChannel.send({ 
                content: '@here Alert from community member',
                embeds: [embed] 
            });
        }

        await interaction.reply({ content: 'Alert sent to moderators.', ephemeral: true });
    }

    // ===========================================
    // REMINDER COMMANDS
    // ===========================================

    async handleRemindMe(interaction) {
        const timeStr = interaction.options.getString('time');
        const message = interaction.options.getString('message');
        const repeatStr = interaction.options.getString('repeat');
        const privacy = (interaction.options.getString('privacy') || 'public').toLowerCase();
        
        const ms = this.parseTime(timeStr);
        if (!ms || ms < 1000) {
            return await interaction.reply({ content: 'Invalid time format. Use formats like 10m, 2h, 1d.', ephemeral: true });
        }

        let repeatMs = null;
        if (repeatStr) {
            repeatMs = this.parseRepeat(repeatStr);
            if (!repeatMs) {
                return await interaction.reply({ content: 'Invalid repeat format. Use formats like "every 8h", "every day".', ephemeral: true });
            }
        }

        const remindAt = Date.now() + ms;
        const reminder_id = `${interaction.user.id}-${Date.now()}-${Math.floor(Math.random()*10000)}`;
        
        await reminders.addReminder({
            id: reminder_id,
            userId: interaction.user.id,
            channelId: interaction.channelId,
            privacy: privacy === 'private' ? 'private' : 'public',
            message,
            time: remindAt,
            repeat: repeatMs
        });

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('Reminder Set')
            .setDescription(`**${message}**`)
            .addFields(
                { name: 'Time', value: `<t:${Math.floor(remindAt/1000)}:F>`, inline: true },
                { name: 'Repeat', value: repeatMs ? repeatStr : 'No', inline: true },
                { name: 'Type', value: privacy, inline: true }
            )
            .setFooter({ text: `ID: ${reminder_id}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleReminders(interaction) {
        const userId = interaction.user.id;
        const action = interaction.options.getString('action') || 'list';
        const id = interaction.options.getString('id');
        const value = interaction.options.getString('value');

        if (action === 'list') {
            const userReminders = await reminders.getUserReminders(userId);
            
            if (!userReminders || userReminders.length === 0) {
                return await interaction.reply({ content: 'You have no reminders.', ephemeral: true });
            }

            const reminderList = userReminders.map(r => 
                `**${r.id}**\n${r.message}\n<t:${Math.floor(r.time/1000)}:R>`
            ).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle('Your Reminders')
                .setDescription(reminderList)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else if (action === 'cancel' && id) {
            await reminders.removeReminder(id);
            await interaction.reply({ content: `Reminder ${id} cancelled.`, ephemeral: true });
        } else if (action === 'edit' && id && value) {
            const r = await reminders.getReminderById(id);
            if (!r || r.userId !== userId) {
                return await interaction.reply({ content: 'Reminder not found.', ephemeral: true });
            }
            r.message = value;
            await reminders.updateReminder(r);
            await interaction.reply({ content: 'Reminder updated.', ephemeral: true });
        } else if (action === 'snooze' && id && value) {
            const r = await reminders.getReminderById(id);
            if (!r || r.userId !== userId) {
                return await interaction.reply({ content: 'Reminder not found.', ephemeral: true });
            }
            const snoozeMs = this.parseTime(value);
            if (!snoozeMs) {
                return await interaction.reply({ content: 'Invalid snooze time.', ephemeral: true });
            }
            r.time = Date.now() + snoozeMs;
            await reminders.updateReminder(r);
            await interaction.reply({ content: 'Reminder snoozed.', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Invalid action or missing ID.', ephemeral: true });
        }
    }

    // ===========================================
    // ACTIVE USERS & MODERATION LISTS
    // ===========================================

    async handleActiveUser(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'add') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            await this.database.addActiveUser(
                guildId,
                user.id,
                user.username,
                interaction.user.username,
                interaction.user.id,
                reason
            );

            const embed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle('✅ Active User Added')
                .setDescription(`**${user.username}** is now immune to auto-moderation.`)
                .addFields(
                    { name: 'User', value: `<@${user.id}>`, inline: true },
                    { name: 'Added by', value: interaction.user.username, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setThumbnail(user.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'remove') {
            const user = interaction.options.getUser('user');

            await this.database.removeActiveUser(guildId, user.id);

            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('🗑️ Active User Removed')
                .setDescription(`**${user.username}** is no longer immune to auto-moderation.`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'list') {
            const page = interaction.options.getInteger('page') || 1;
            const perPage = 10;
            const activeUsers = await this.database.getActiveUsers(guildId);

            if (!activeUsers || activeUsers.length === 0) {
                return await interaction.reply({ content: 'No active users configured.', ephemeral: true });
            }

            const totalPages = Math.ceil(activeUsers.length / perPage);
            const startIdx = (page - 1) * perPage;
            const pageUsers = activeUsers.slice(startIdx, startIdx + perPage);

            const userList = pageUsers.map((u, i) => {
                const addedDate = u.addedAt ? `<t:${Math.floor(u.addedAt.getTime() / 1000)}:R>` : 'Unknown';
                return `**${startIdx + i + 1}.** <@${u.userId}> (${u.username})\n   └ Added by ${u.addedBy} ${addedDate}\n   └ *${u.reason || 'No reason'}*`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle('🛡️ Active Users (Auto-mod Immune)')
                .setDescription(userList)
                .setFooter({ text: `Page ${page}/${totalPages} • ${activeUsers.length} active user(s) • Mods can still manually moderate these users` })
                .setTimestamp();

            // Pagination buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`activeusers_prev_${page}`)
                        .setLabel('◀ Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page <= 1),
                    new ButtonBuilder()
                        .setCustomId(`activeusers_page_${page}`)
                        .setLabel(`${page}/${totalPages}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`activeusers_next_${page}`)
                        .setLabel('Next ▶')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page >= totalPages)
                );

            await interaction.reply({ embeds: [embed], components: totalPages > 1 ? [row] : [], ephemeral: true });
        }
    }

    async handleWarns(interaction) {
        const guildId = interaction.guild.id;
        const filterUser = interaction.options.getUser('user');
        const page = interaction.options.getInteger('page') || 1;
        const perPage = 10;

        let warns;
        if (filterUser) {
            warns = await this.database.getCases(guildId, filterUser.id, 50);
            warns = warns.filter(c => c.action === 'warn');
        } else {
            warns = await this.database.getWarnList(guildId, 100);
        }

        if (!warns || warns.length === 0) {
            return await interaction.reply({ 
                content: filterUser ? `No warnings found for ${filterUser.username}.` : 'No warnings found in this server.',
                ephemeral: true 
            });
        }

        const totalPages = Math.ceil(warns.length / perPage);
        const startIdx = (page - 1) * perPage;
        const pageWarns = warns.slice(startIdx, startIdx + perPage);

        const warnList = pageWarns.map((w, i) => {
            const date = w.timestamp ? `<t:${Math.floor(new Date(w.timestamp).getTime() / 1000)}:d>` : '?';
            const mod = w.automated ? '🤖 Auto' : w.moderator || 'Unknown';
            return `\`${w.caseId || '?'}\` <@${w.userId}> • ${date}\n└ **${w.reason || 'No reason'}** *(${mod})*`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle(`⚠️ Warnings ${filterUser ? `for ${filterUser.username}` : ''}`)
            .setDescription(warnList || 'No warnings to display.')
            .setFooter({ text: `Page ${page}/${totalPages} • ${warns.length} total warnings` })
            .setTimestamp();

        // Pagination buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`warns_prev_${filterUser?.id || 'all'}_${page}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page <= 1),
                new ButtonBuilder()
                    .setCustomId(`warns_page_${filterUser?.id || 'all'}_${page}`)
                    .setLabel(`${page}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`warns_next_${filterUser?.id || 'all'}_${page}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPages)
            );

        await interaction.reply({ embeds: [embed], components: totalPages > 1 ? [row] : [], ephemeral: true });
    }

    async handleBans(interaction) {
        const guildId = interaction.guild.id;
        const page = interaction.options.getInteger('page') || 1;
        const perPage = 10;

        const bans = await this.database.getBanList(guildId, 100);

        if (!bans || bans.length === 0) {
            return await interaction.reply({ content: 'No bans found in this server.', ephemeral: true });
        }

        const totalPages = Math.ceil(bans.length / perPage);
        const startIdx = (page - 1) * perPage;
        const pageBans = bans.slice(startIdx, startIdx + perPage);

        const banList = pageBans.map((b, i) => {
            const date = b.timestamp ? `<t:${Math.floor(new Date(b.timestamp).getTime() / 1000)}:d>` : '?';
            const mod = b.automated ? '🤖 Auto' : b.moderator || 'Unknown';
            return `\`${b.caseId || '?'}\` <@${b.userId}> • ${date}\n└ **${b.reason || 'No reason'}** *(${mod})*`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('🔨 Bans')
            .setDescription(banList || 'No bans to display.')
            .setFooter({ text: `Page ${page}/${totalPages} • ${bans.length} total bans` })
            .setTimestamp();

        // Pagination buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`bans_prev_${page}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page <= 1),
                new ButtonBuilder()
                    .setCustomId(`bans_page_${page}`)
                    .setLabel(`${page}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`bans_next_${page}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPages)
            );

        await interaction.reply({ embeds: [embed], components: totalPages > 1 ? [row] : [], ephemeral: true });
    }

    async handleMutes(interaction) {
        const guildId = interaction.guild.id;
        const activeOnly = interaction.options.getBoolean('active') || false;
        const page = interaction.options.getInteger('page') || 1;
        const perPage = 10;

        let mutes;
        if (activeOnly) {
            mutes = await this.database.getActiveMutes(guildId);
        } else {
            mutes = await this.database.getMuteList(guildId, 100);
        }

        if (!mutes || mutes.length === 0) {
            return await interaction.reply({ 
                content: activeOnly ? 'No active mutes found.' : 'No mutes found in this server.',
                ephemeral: true 
            });
        }

        const totalPages = Math.ceil(mutes.length / perPage);
        const startIdx = (page - 1) * perPage;
        const pageMutes = mutes.slice(startIdx, startIdx + perPage);

        let muteList;
        if (activeOnly) {
            // Active mutes from User collection
            muteList = pageMutes.map((m, i) => {
                const until = m.mutedUntil ? `<t:${Math.floor(m.mutedUntil.getTime() / 1000)}:R>` : 'Indefinite';
                return `<@${m.userId}>\n└ Expires: ${until}`;
            }).join('\n\n');
        } else {
            // All mutes from ModerationCase collection
            muteList = pageMutes.map((m, i) => {
                const date = m.timestamp ? `<t:${Math.floor(new Date(m.timestamp).getTime() / 1000)}:d>` : '?';
                const mod = m.automated ? '🤖 Auto' : m.moderator || 'Unknown';
                const duration = m.duration ? `${m.duration}min` : 'N/A';
                return `\`${m.caseId || '?'}\` <@${m.userId}> • ${date} • ${duration}\n└ **${m.reason || 'No reason'}** *(${mod})*`;
            }).join('\n\n');
        }

        const embed = new EmbedBuilder()
            .setColor(0xFF8C00)
            .setTitle(activeOnly ? '🔇 Active Mutes' : '🔇 Mute History')
            .setDescription(muteList || 'No mutes to display.')
            .setFooter({ text: `Page ${page}/${totalPages} • ${mutes.length} total` })
            .setTimestamp();

        // Pagination buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`mutes_prev_${activeOnly ? 'active' : 'all'}_${page}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page <= 1),
                new ButtonBuilder()
                    .setCustomId(`mutes_page_${activeOnly ? 'active' : 'all'}_${page}`)
                    .setLabel(`${page}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`mutes_next_${activeOnly ? 'active' : 'all'}_${page}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPages)
            );

        await interaction.reply({ embeds: [embed], components: totalPages > 1 ? [row] : [], ephemeral: true });
    }

    // ===========================================
    // UTILITY METHODS
    // ===========================================

    getActionColor(action) {
        const colors = {
            warn: 0xFFFF00,
            mute: 0xFF8C00,
            timeout: 0xFF8C00,
            ban: 0xFF0000,
            kick: 0xFF4500,
            unmute: 0x00FF00,
            unban: 0x00FF00,
            unwarn: 0x00FF00
        };
        return colors[action] || 0x5865F2;
    }

    parseTime(str) {
        const match = str.match(/^(\d+)([smhd])$/i);
        if (!match) return null;
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        switch(unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return null;
        }
    }

    parseRepeat(str) {
        const match = str.match(/^every\s+(\d+)?\s*([smhd]|day)$/i);
        if (!match) return null;
        let value = match[1] ? parseInt(match[1]) : 1;
        let unit = match[2].toLowerCase();
        if (unit === 'day') unit = 'd';
        switch(unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return null;
        }
    }

    formatDuration(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));

        let parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0 && parts.length === 0) parts.push(`${seconds}s`);

        return parts.join(' ') || '0s';
    }

    // ===========================================
    // GAME COMMANDS
    // ===========================================

    async handleGame(interaction) {
        const gameType = interaction.options.getString('type');
        const maxPlayers = interaction.options.getInteger('players') || 10;

        try {
            switch (gameType) {
                case 'reflex':
                    return await this.games.startReflexRoulette(interaction, maxPlayers);
                case 'mindlock':
                    return await this.games.startMindLock(interaction, maxPlayers);
                case 'bluff':
                    return await this.games.startBluffOrBust(interaction, maxPlayers);
                case 'timetrap':
                    return await this.games.startTimeTrap(interaction, maxPlayers);
                case 'wordheist':
                    return await this.games.startWordHeist(interaction, maxPlayers);
                case 'chaosvote':
                    return await this.games.startChaosVote(interaction, maxPlayers);
                case 'buttonpanic':
                    return await this.games.startButtonPanic(interaction, maxPlayers);
                case 'logicgrid':
                    return await this.games.startLogicGrid(interaction, maxPlayers);
                default:
                    return await interaction.reply({ content: 'Unknown game type.', ephemeral: true });
            }
        } catch (error) {
            console.error('Game start error:', error);
            return await interaction.reply({ content: 'Failed to start game. Try again.', ephemeral: true });
        }
    }

    async handleDuel(interaction) {
        const opponent = interaction.options.getUser('opponent');
        
        if (opponent.id === interaction.user.id) {
            return await interaction.reply({ content: 'You can\'t duel yourself!', ephemeral: true });
        }
        
        if (opponent.bot) {
            return await interaction.reply({ content: 'You can\'t duel a bot!', ephemeral: true });
        }

        try {
            await this.games.startDuelDraw(interaction, opponent);
        } catch (error) {
            console.error('Duel start error:', error);
            return await interaction.reply({ content: 'Failed to start duel. Try again.', ephemeral: true });
        }
    }

    async handleDaily(interaction) {
        try {
            await this.games.startDailyChallenge(interaction);
        } catch (error) {
            console.error('Daily challenge error:', error);
            return await interaction.reply({ content: 'Failed to start daily challenge.', ephemeral: true });
        }
    }

    async handleLeaderboard(interaction) {
        const gameType = interaction.options.getString('game') || 'all';
        const period = interaction.options.getString('period') || 'alltime';
        const guildId = interaction.guild.id;

        try {
            let leaderboard;
            if (gameType === 'all') {
                leaderboard = await this.games.getLeaderboard(guildId, 'reflex', period);
            } else {
                leaderboard = await this.games.getLeaderboard(guildId, gameType, period);
            }

            if (!leaderboard || leaderboard.length === 0) {
                return await interaction.reply({ content: 'No leaderboard data yet. Play some games!', ephemeral: true });
            }

            const gameNames = {
                reflex: '⚡ Reflex Roulette',
                timetrap: '⏱️ Time Trap',
                dueldraw: '🤠 Duel Draw',
                daily: '📅 Daily Challenges',
                all: '🎮 All Games'
            };

            const periodNames = {
                alltime: 'All Time',
                weekly: 'This Week',
                daily: 'Today'
            };

            let leaderboardText = '';
            leaderboard.forEach((entry, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                leaderboardText += `${medal} **${entry.username}** - ${entry.wins} wins (${entry.gamesPlayed} games)\n`;
            });

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle(`${gameNames[gameType] || gameType} Leaderboard`)
                .setDescription(leaderboardText || 'No entries yet!')
                .setFooter({ text: `Period: ${periodNames[period]}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Leaderboard error:', error);
            return await interaction.reply({ content: 'Failed to load leaderboard.', ephemeral: true });
        }
    }

    async handleAchievements(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;

        try {
            const achievements = await this.games.getUserAchievements(guildId, targetUser.id);
            const allAchievements = this.games.achievements;

            // Group by category
            const unlocked = achievements.filter(a => a);
            const unlockedIds = new Set(unlocked.map(a => a.achievementId));

            // Build display
            let achievementText = '';
            
            const rarityColors = {
                common: '⬜',
                uncommon: '🟩',
                rare: '🟦',
                epic: '🟪',
                legendary: '🟨'
            };

            // Show unlocked achievements
            if (unlocked.length > 0) {
                achievementText += '**Unlocked:**\n';
                unlocked.forEach(a => {
                    achievementText += `${a.icon} **${a.name}** ${rarityColors[a.rarity] || ''}\n`;
                    achievementText += `  └ ${a.description}\n`;
                });
            }

            // Show locked achievements (excluding hidden ones)
            const locked = allAchievements.filter(a => !unlockedIds.has(a.achievementId) && !a.hidden);
            if (locked.length > 0) {
                achievementText += '\n**Locked:**\n';
                locked.slice(0, 10).forEach(a => {
                    achievementText += `🔒 ~~${a.name}~~ ${rarityColors[a.rarity] || ''}\n`;
                });
                if (locked.length > 10) {
                    achievementText += `  ...and ${locked.length - 10} more\n`;
                }
            }

            // Count hidden
            const hiddenCount = allAchievements.filter(a => a.hidden && !unlockedIds.has(a.achievementId)).length;
            if (hiddenCount > 0) {
                achievementText += `\n🔮 ${hiddenCount} secret achievements to discover...`;
            }

            const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle(`🏆 ${targetUser.username}'s Achievements`)
                .setDescription(achievementText || 'No achievements yet! Start playing games.')
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({ text: `${unlocked.length}/${allAchievements.length} unlocked` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Achievements error:', error);
            return await interaction.reply({ content: 'Failed to load achievements.', ephemeral: true });
        }
    }

    async handleGameStats(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;

        try {
            const stats = await this.games.getUserStats(guildId, targetUser.id);

            if (!stats) {
                return await interaction.reply({ content: `${targetUser.username} hasn't played any games yet!`, ephemeral: true });
            }

            const winRate = stats.totalGamesPlayed > 0 
                ? Math.round((stats.totalWins / stats.totalGamesPlayed) * 100) 
                : 0;

            // Build per-game stats
            let gameBreakdown = '';
            const gameNames = {
                reflex: '⚡ Reflex',
                mindlock: '🧠 Mind Lock',
                timetrap: '⏱️ Time Trap',
                bluff: '🎭 Bluff or Bust',
                wordheist: '📚 Word Heist',
                chaosvote: '🗳️ Chaos Vote',
                buttonpanic: '🚨 Button Panic',
                dueldraw: '🤠 Duel Draw',
                logicgrid: '🧩 Logic Grid'
            };

            if (stats.gameStats) {
                for (const [game, data] of Object.entries(stats.gameStats)) {
                    if (data && data.played > 0) {
                        const gameWinRate = Math.round((data.wins / data.played) * 100);
                        gameBreakdown += `${gameNames[game] || game}: ${data.wins}W/${data.played}P (${gameWinRate}%)\n`;
                    }
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle(`📊 ${targetUser.username}'s Game Stats`)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: 'Total Games', value: `${stats.totalGamesPlayed}`, inline: true },
                    { name: 'Total Wins', value: `${stats.totalWins}`, inline: true },
                    { name: 'Win Rate', value: `${winRate}%`, inline: true },
                    { name: 'Daily Streak', value: `🔥 ${stats.dailyChallengeStreak || 0}`, inline: true },
                    { name: 'Best Streak', value: `⭐ ${stats.bestWinStreak || 0}`, inline: true },
                    { name: 'Current Streak', value: `📈 ${stats.currentWinStreak || 0}`, inline: true }
                )
                .setTimestamp();

            if (gameBreakdown) {
                embed.addFields({ name: 'Game Breakdown', value: gameBreakdown });
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Game stats error:', error);
            return await interaction.reply({ content: 'Failed to load stats.', ephemeral: true });
        }
    }

    async handleRank(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;

        try {
            const { UserGameStats } = require('./models');
            
            // Get all players' stats to calculate rank
            const allStats = await UserGameStats.find({ guildId })
                .sort({ totalWins: -1, totalGamesPlayed: -1 });
            
            const userStats = allStats.find(s => s.odUserId === targetUser.id);
            
            if (!userStats) {
                return await interaction.reply({ 
                    content: `${targetUser.username} hasn't played any games yet! Start with \`/game\``, 
                    ephemeral: true 
                });
            }

            const rank = allStats.findIndex(s => s.odUserId === targetUser.id) + 1;
            const totalPlayers = allStats.length;
            const percentile = Math.round((1 - (rank / totalPlayers)) * 100);

            // Determine rank tier
            let tier, tierColor, tierEmoji;
            if (rank === 1) { tier = 'Champion'; tierColor = 0xFFD700; tierEmoji = '👑'; }
            else if (rank <= 3) { tier = 'Elite'; tierColor = 0xE91E63; tierEmoji = '💎'; }
            else if (rank <= 10) { tier = 'Veteran'; tierColor = 0x9B59B6; tierEmoji = '🏆'; }
            else if (percentile >= 75) { tier = 'Expert'; tierColor = 0x3498DB; tierEmoji = '⭐'; }
            else if (percentile >= 50) { tier = 'Skilled'; tierColor = 0x2ECC71; tierEmoji = '🎮'; }
            else if (percentile >= 25) { tier = 'Rising'; tierColor = 0xF1C40F; tierEmoji = '📈'; }
            else { tier = 'Newcomer'; tierColor = 0x95A5A6; tierEmoji = '🌱'; }

            const winRate = userStats.totalGamesPlayed > 0 
                ? Math.round((userStats.totalWins / userStats.totalGamesPlayed) * 100) 
                : 0;

            const embed = new EmbedBuilder()
                .setColor(tierColor)
                .setTitle(`${tierEmoji} ${targetUser.username}'s Rank`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setDescription(`**${tier}** • Top ${percentile}%`)
                .addFields(
                    { name: '🏅 Server Rank', value: `#${rank} of ${totalPlayers}`, inline: true },
                    { name: '🎯 Win Rate', value: `${winRate}%`, inline: true },
                    { name: '🎮 Games Played', value: `${userStats.totalGamesPlayed}`, inline: true },
                    { name: '🏆 Total Wins', value: `${userStats.totalWins}`, inline: true },
                    { name: '🔥 Daily Streak', value: `${userStats.dailyChallengeStreak || 0}`, inline: true },
                    { name: '📈 Best Streak', value: `${userStats.bestWinStreak || 0}`, inline: true }
                )
                .setFooter({ text: `Use /ranks to see the full leaderboard!` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Rank error:', error);
            return await interaction.reply({ content: 'Failed to load rank.', ephemeral: true });
        }
    }

    async handleRanks(interaction) {
        const guildId = interaction.guild.id;
        const gameFilter = interaction.options.getString('game') || 'all';
        const page = interaction.options.getInteger('page') || 1;
        const perPage = 10;

        try {
            const { UserGameStats, LeaderboardEntry } = require('./models');
            
            let allStats;
            let title;
            
            const gameNames = {
                reflex: '⚡ Reflex Roulette',
                mindlock: '🧠 Mind Lock',
                timetrap: '⏱️ Time Trap',
                bluff: '🎭 Bluff or Bust',
                wordheist: '📚 Word Heist',
                chaosvote: '🗳️ Chaos Vote',
                buttonpanic: '🚨 Button Panic',
                dueldraw: '🤠 Duel Draw',
                logicgrid: '🧩 Logic Grid'
            };

            if (gameFilter === 'all') {
                allStats = await UserGameStats.find({ guildId })
                    .sort({ totalWins: -1, totalGamesPlayed: -1 });
                title = '🏆 Server Rankings - All Games';
            } else {
                // Get leaderboard for specific game
                allStats = await LeaderboardEntry.find({ guildId, gameType: gameFilter, period: 'alltime' })
                    .sort({ wins: -1, gamesPlayed: -1 });
                title = `🏆 Server Rankings - ${gameNames[gameFilter] || gameFilter}`;
            }

            if (!allStats || allStats.length === 0) {
                return await interaction.reply({ 
                    content: 'No rankings yet! Start playing with `/game` to get on the board!', 
                    ephemeral: true 
                });
            }

            const totalPages = Math.ceil(allStats.length / perPage);
            const currentPage = Math.min(page, totalPages);
            const startIdx = (currentPage - 1) * perPage;
            const endIdx = startIdx + perPage;
            const pageStats = allStats.slice(startIdx, endIdx);

            // Build rankings display - fetch usernames from Discord if not in DB
            let rankingsText = '';
            for (let i = 0; i < pageStats.length; i++) {
                const rank = startIdx + i + 1;
                const stat = pageStats[i];
                let username = stat.username;
                
                // If no username stored, try to fetch from Discord
                if (!username || username.startsWith('User ')) {
                    try {
                        const user = await interaction.client.users.fetch(stat.odUserId);
                        username = user.username;
                    } catch {
                        username = `User ${stat.odUserId?.slice(-4) || '????'}`;
                    }
                }
                
                const wins = gameFilter === 'all' ? stat.totalWins : stat.wins;
                const games = gameFilter === 'all' ? stat.totalGamesPlayed : stat.gamesPlayed;
                const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
                
                let medal = '';
                if (rank === 1) medal = '🥇';
                else if (rank === 2) medal = '🥈';
                else if (rank === 3) medal = '🥉';
                else medal = `**${rank}.**`;
                
                rankingsText += `${medal} **${username}** — ${wins}W / ${games}P (${winRate}%)\n`;
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle(title)
                .setDescription(rankingsText || 'No players yet!')
                .setFooter({ text: `Page ${currentPage}/${totalPages} • ${allStats.length} total players` })
                .setTimestamp();

            // Create pagination buttons
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ranks_prev_${gameFilter}_${currentPage}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage <= 1),
                new ButtonBuilder()
                    .setCustomId(`ranks_page_${gameFilter}_${currentPage}`)
                    .setLabel(`${currentPage}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`ranks_next_${gameFilter}_${currentPage}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Ranks error:', error);
            return await interaction.reply({ content: 'Failed to load rankings.', ephemeral: true });
        }
    }

    async handleRanksPagination(interaction, gameFilter, page) {
        const guildId = interaction.guild.id;
        const perPage = 10;

        try {
            const { UserGameStats, LeaderboardEntry } = require('./models');
            
            let allStats;
            let title;
            
            const gameNames = {
                reflex: '⚡ Reflex Roulette',
                mindlock: '🧠 Mind Lock',
                timetrap: '⏱️ Time Trap',
                bluff: '🎭 Bluff or Bust',
                wordheist: '📚 Word Heist',
                chaosvote: '🗳️ Chaos Vote',
                buttonpanic: '🚨 Button Panic',
                dueldraw: '🤠 Duel Draw',
                logicgrid: '🧩 Logic Grid'
            };

            if (gameFilter === 'all') {
                allStats = await UserGameStats.find({ guildId })
                    .sort({ totalWins: -1, totalGamesPlayed: -1 });
                title = '🏆 Server Rankings - All Games';
            } else {
                allStats = await LeaderboardEntry.find({ guildId, gameType: gameFilter, period: 'alltime' })
                    .sort({ wins: -1, gamesPlayed: -1 });
                title = `🏆 Server Rankings - ${gameNames[gameFilter] || gameFilter}`;
            }

            const totalPages = Math.ceil(allStats.length / perPage);
            const currentPage = Math.max(1, Math.min(page, totalPages));
            const startIdx = (currentPage - 1) * perPage;
            const pageStats = allStats.slice(startIdx, startIdx + perPage);

            let rankingsText = '';
            for (let i = 0; i < pageStats.length; i++) {
                const rank = startIdx + i + 1;
                const stat = pageStats[i];
                let username = stat.username;
                
                // If no username stored, try to fetch from Discord
                if (!username || username.startsWith('User ')) {
                    try {
                        const user = await interaction.client.users.fetch(stat.odUserId);
                        username = user.username;
                    } catch {
                        username = `User ${stat.odUserId?.slice(-4) || '????'}`;
                    }
                }
                
                const wins = gameFilter === 'all' ? stat.totalWins : stat.wins;
                const games = gameFilter === 'all' ? stat.totalGamesPlayed : stat.gamesPlayed;
                const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
                
                let medal = '';
                if (rank === 1) medal = '🥇';
                else if (rank === 2) medal = '🥈';
                else if (rank === 3) medal = '🥉';
                else medal = `**${rank}.**`;
                
                rankingsText += `${medal} **${username}** — ${wins}W / ${games}P (${winRate}%)\n`;
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle(title)
                .setDescription(rankingsText || 'No players yet!')
                .setFooter({ text: `Page ${currentPage}/${totalPages} • ${allStats.length} total players` })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ranks_prev_${gameFilter}_${currentPage}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage <= 1),
                new ButtonBuilder()
                    .setCustomId(`ranks_page_${gameFilter}_${currentPage}`)
                    .setLabel(`${currentPage}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`ranks_next_${gameFilter}_${currentPage}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages)
            );

            await interaction.update({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Ranks pagination error:', error);
            await interaction.reply({ content: 'Failed to load rankings.', ephemeral: true });
        }
    }

    // Warns pagination handler
    async handleWarnsPagination(interaction, userFilter, page) {
        const guildId = interaction.guild.id;
        const perPage = 10;

        let warns;
        if (userFilter !== 'all') {
            warns = await this.database.getCases(guildId, userFilter, 50);
            warns = warns.filter(c => c.action === 'warn');
        } else {
            warns = await this.database.getWarnList(guildId, 100);
        }

        const totalPages = Math.ceil(warns.length / perPage);
        const currentPage = Math.max(1, Math.min(page, totalPages));
        const startIdx = (currentPage - 1) * perPage;
        const pageWarns = warns.slice(startIdx, startIdx + perPage);

        const warnList = pageWarns.map((w, i) => {
            const date = w.timestamp ? `<t:${Math.floor(new Date(w.timestamp).getTime() / 1000)}:d>` : '?';
            const mod = w.automated ? '🤖 Auto' : w.moderator || 'Unknown';
            return `\`${w.caseId || '?'}\` <@${w.userId}> • ${date}\n└ **${w.reason || 'No reason'}** *(${mod})*`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle(`⚠️ Warnings`)
            .setDescription(warnList || 'No warnings to display.')
            .setFooter({ text: `Page ${currentPage}/${totalPages} • ${warns.length} total warnings` })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`warns_prev_${userFilter}_${currentPage}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage <= 1),
                new ButtonBuilder()
                    .setCustomId(`warns_page_${userFilter}_${currentPage}`)
                    .setLabel(`${currentPage}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`warns_next_${userFilter}_${currentPage}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages)
            );

        await interaction.update({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
    }

    // Bans pagination handler
    async handleBansPagination(interaction, page) {
        const guildId = interaction.guild.id;
        const perPage = 10;

        const bans = await this.database.getBanList(guildId, 100);

        const totalPages = Math.ceil(bans.length / perPage);
        const currentPage = Math.max(1, Math.min(page, totalPages));
        const startIdx = (currentPage - 1) * perPage;
        const pageBans = bans.slice(startIdx, startIdx + perPage);

        const banList = pageBans.map((b, i) => {
            const date = b.timestamp ? `<t:${Math.floor(new Date(b.timestamp).getTime() / 1000)}:d>` : '?';
            const mod = b.automated ? '🤖 Auto' : b.moderator || 'Unknown';
            return `\`${b.caseId || '?'}\` <@${b.userId}> • ${date}\n└ **${b.reason || 'No reason'}** *(${mod})*`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('🔨 Bans')
            .setDescription(banList || 'No bans to display.')
            .setFooter({ text: `Page ${currentPage}/${totalPages} • ${bans.length} total bans` })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`bans_prev_${currentPage}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage <= 1),
                new ButtonBuilder()
                    .setCustomId(`bans_page_${currentPage}`)
                    .setLabel(`${currentPage}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`bans_next_${currentPage}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages)
            );

        await interaction.update({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
    }

    // Mutes pagination handler
    async handleMutesPagination(interaction, activeFilter, page) {
        const guildId = interaction.guild.id;
        const perPage = 10;
        const activeOnly = activeFilter === 'active';

        let mutes;
        if (activeOnly) {
            mutes = await this.database.getActiveMutes(guildId);
        } else {
            mutes = await this.database.getMuteList(guildId, 100);
        }

        const totalPages = Math.ceil(mutes.length / perPage);
        const currentPage = Math.max(1, Math.min(page, totalPages));
        const startIdx = (currentPage - 1) * perPage;
        const pageMutes = mutes.slice(startIdx, startIdx + perPage);

        let muteList;
        if (activeOnly) {
            muteList = pageMutes.map((m, i) => {
                const until = m.mutedUntil ? `<t:${Math.floor(m.mutedUntil.getTime() / 1000)}:R>` : 'Indefinite';
                return `<@${m.userId}>\n└ Expires: ${until}`;
            }).join('\n\n');
        } else {
            muteList = pageMutes.map((m, i) => {
                const date = m.timestamp ? `<t:${Math.floor(new Date(m.timestamp).getTime() / 1000)}:d>` : '?';
                const mod = m.automated ? '🤖 Auto' : m.moderator || 'Unknown';
                const duration = m.duration ? `${m.duration}min` : 'N/A';
                return `\`${m.caseId || '?'}\` <@${m.userId}> • ${date} • ${duration}\n└ **${m.reason || 'No reason'}** *(${mod})*`;
            }).join('\n\n');
        }

        const embed = new EmbedBuilder()
            .setColor(0xFF8C00)
            .setTitle(activeOnly ? '🔇 Active Mutes' : '🔇 Mute History')
            .setDescription(muteList || 'No mutes to display.')
            .setFooter({ text: `Page ${currentPage}/${totalPages} • ${mutes.length} total` })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`mutes_prev_${activeFilter}_${currentPage}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage <= 1),
                new ButtonBuilder()
                    .setCustomId(`mutes_page_${activeFilter}_${currentPage}`)
                    .setLabel(`${currentPage}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`mutes_next_${activeFilter}_${currentPage}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages)
            );

        await interaction.update({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
    }

    // Cases pagination handler
    async handleCasesPagination(interaction, userFilter, page) {
        const guildId = interaction.guild.id;
        const perPage = 10;

        let cases;
        let title;

        if (userFilter !== 'all') {
            cases = await this.database.getUserCases(userFilter, guildId);
            title = 'User Cases';
        } else {
            cases = await this.database.getRecentCases(guildId, 100);
            title = 'Recent Cases';
        }

        const totalPages = Math.ceil(cases.length / perPage);
        const currentPage = Math.max(1, Math.min(page, totalPages));
        const startIdx = (currentPage - 1) * perPage;
        const pageCases = cases.slice(startIdx, startIdx + perPage);

        const caseList = pageCases.map(c => 
            `**#${c.caseId}** | ${c.action.toUpperCase()} | <@${c.userId}> | ${c.reason?.substring(0, 50) || 'No reason'}...`
        ).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(title)
            .setDescription(caseList)
            .setFooter({ text: `Page ${currentPage}/${totalPages} • ${cases.length} total cases` })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`cases_prev_${userFilter}_${currentPage}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage <= 1),
                new ButtonBuilder()
                    .setCustomId(`cases_page_${userFilter}_${currentPage}`)
                    .setLabel(`${currentPage}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`cases_next_${userFilter}_${currentPage}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages)
            );

        await interaction.update({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
    }

    // Audit log pagination handler
    async handleAuditLogPagination(interaction, page) {
        const perPage = 10;
        const logs = await this.database.getAuditLog(interaction.guild.id, 100);

        const actionIcons = {
            'warn': '⚠️',
            'mute': '🔇',
            'unmute': '🔊',
            'ban': '🔨',
            'unban': '🔓',
            'kick': '👢',
            'timeout': '⏱️',
            'delete': '🗑️',
            'addword': '➕',
            'removeword': '➖',
            'settings': '⚙️',
            'appeal': '📝',
            'default': '📋'
        };

        const totalPages = Math.ceil(logs.length / perPage);
        const currentPage = Math.max(1, Math.min(page, totalPages));
        const startIdx = (currentPage - 1) * perPage;
        const pageLogs = logs.slice(startIdx, startIdx + perPage);

        const logEntries = pageLogs.map(l => {
            const icon = actionIcons[l.actionType?.toLowerCase()] || actionIcons['default'];
            const time = `<t:${Math.floor(new Date(l.timestamp).getTime() / 1000)}:R>`;
            const target = l.targetUserId ? `<@${l.targetUserId}>` : '';
            const performer = l.performedBy || 'Barry (Auto)';
            const details = l.details ? ` - ${l.details.substring(0, 50)}` : '';
            return `${icon} **${l.actionType?.toUpperCase() || 'ACTION'}** ${time}\n   By: ${performer} ${target ? `| Target: ${target}` : ''}${details}`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(0x2F3136)
            .setTitle(`📜 Audit Log - ${interaction.guild.name}`)
            .setDescription(logEntries || 'No entries')
            .addFields(
                { name: 'Server ID', value: interaction.guild.id, inline: true },
                { name: 'Page', value: `${currentPage}/${totalPages}`, inline: true },
                { name: 'Total', value: `${logs.length}`, inline: true }
            )
            .setFooter({ text: 'Barry Bot Audit Log • Actions are server-specific' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`auditlog_prev_${currentPage}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage <= 1),
                new ButtonBuilder()
                    .setCustomId(`auditlog_page_${currentPage}`)
                    .setLabel(`${currentPage}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`auditlog_next_${currentPage}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages)
            );

        await interaction.update({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
    }

    // Active users pagination handler
    async handleActiveUsersPagination(interaction, page) {
        const guildId = interaction.guild.id;
        const perPage = 10;
        const activeUsers = await this.database.getActiveUsers(guildId);

        const totalPages = Math.ceil(activeUsers.length / perPage);
        const currentPage = Math.max(1, Math.min(page, totalPages));
        const startIdx = (currentPage - 1) * perPage;
        const pageUsers = activeUsers.slice(startIdx, startIdx + perPage);

        const userList = pageUsers.map((u, i) => {
            const addedDate = u.addedAt ? `<t:${Math.floor(u.addedAt.getTime() / 1000)}:R>` : 'Unknown';
            return `**${startIdx + i + 1}.** <@${u.userId}> (${u.username})\n   └ Added by ${u.addedBy} ${addedDate}\n   └ *${u.reason || 'No reason'}*`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('🛡️ Active Users (Auto-mod Immune)')
            .setDescription(userList)
            .setFooter({ text: `Page ${currentPage}/${totalPages} • ${activeUsers.length} active user(s) • Mods can still manually moderate these users` })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`activeusers_prev_${currentPage}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage <= 1),
                new ButtonBuilder()
                    .setCustomId(`activeusers_page_${currentPage}`)
                    .setLabel(`${currentPage}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`activeusers_next_${currentPage}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages)
            );

        await interaction.update({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
    }

    // Game button handler - called from index.js
    async handleGameButton(interaction) {
        const customId = interaction.customId;
        
        try {
            // Game lobby buttons
            if (customId.startsWith('game_join_')) {
                const gameId = customId.replace('game_join_', '');
                return await this.games.handleJoinGame(interaction, gameId);
            }
            
            if (customId.startsWith('game_start_')) {
                const gameId = customId.replace('game_start_', '');
                return await this.games.handleStartGame(interaction, gameId);
            }
            
            if (customId.startsWith('game_cancel_')) {
                const gameId = customId.replace('game_cancel_', '');
                return await this.games.handleCancelGame(interaction, gameId);
            }

            // Reflex Roulette
            if (customId.startsWith('reflex_hit_')) {
                const gameId = customId.replace('reflex_hit_', '');
                const session = this.games.activeSessions.get(gameId);
                if (session) {
                    const reactionTime = Date.now() - session.gameData.startTime;
                    return await this.games.handleReflexWin(interaction, session, reactionTime);
                }
            }

            // Time Trap
            if (customId.startsWith('timetrap_click_')) {
                const gameId = customId.replace('timetrap_click_', '');
                const session = this.games.activeSessions.get(gameId);
                if (session) {
                    return await this.games.handleTimeTrapClick(interaction, session);
                }
            }

            // Mind Lock
            if (customId.startsWith('mindlock_')) {
                const parts = customId.split('_');
                const gameId = parts[1];
                const symbolIndex = parseInt(parts[2]);
                const session = this.games.activeSessions.get(gameId);
                if (session) {
                    return await this.games.handleMindLockClick(interaction, session, symbolIndex);
                }
            }

            // Logic Grid
            if (customId.startsWith('logicgrid_answer_')) {
                const parts = customId.split('_');
                const gameId = parts[2];
                const answer = parts[3];
                const session = this.games.activeSessions.get(gameId);
                if (session) {
                    return await this.games.handleLogicGridAnswer(interaction, session, answer);
                }
            }

            if (customId.startsWith('logicgrid_hint_')) {
                const gameId = customId.replace('logicgrid_hint_', '');
                const session = this.games.activeSessions.get(gameId);
                if (session) {
                    return await this.games.handleLogicGridHint(interaction, session);
                }
            }

            // Chaos Vote
            if (customId.startsWith('chaosvote_')) {
                const parts = customId.split('_');
                const gameId = parts[1];
                const votedFor = parts[2];
                const session = this.games.activeSessions.get(gameId);
                if (session) {
                    // Prevent self-voting
                    if (votedFor === interaction.user.id) {
                        return await interaction.reply({ content: '❌ You cannot vote for yourself!', ephemeral: true });
                    }
                    session.gameData.votes[interaction.user.id] = votedFor;
                    this.games.activeSessions.set(gameId, session);
                    return await interaction.reply({ content: '✅ Vote recorded!', ephemeral: true });
                }
            }

            // Button Panic
            if (customId.startsWith('panic_')) {
                const parts = customId.split('_');
                const gameId = parts[1];
                const buttonIndex = parseInt(parts[2]);
                const session = this.games.activeSessions.get(gameId);
                if (session) {
                    return await this.games.handleButtonPanicClick(interaction, session, buttonIndex);
                }
            }

            // Duel Draw
            if (customId.startsWith('duel_accept_')) {
                const gameId = customId.replace('duel_accept_', '');
                const session = this.games.activeSessions.get(gameId);
                if (session && session.players[1].odUserId === interaction.user.id) {
                    session.players[1].ready = true;
                    return await this.games.runDuelDraw(interaction, session);
                }
                return await interaction.reply({ content: 'This challenge wasn\'t for you!', ephemeral: true });
            }

            if (customId.startsWith('duel_draw_')) {
                const gameId = customId.replace('duel_draw_', '');
                const session = this.games.activeSessions.get(gameId);
                if (session) {
                    return await this.games.handleDuelClick(interaction, session);
                }
            }

            // Bluff or Bust voting
            if (customId.startsWith('bluff_vote_')) {
                const parts = customId.split('_');
                const gameId = parts[2];
                const votedFor = parts[3];
                const session = this.games.activeSessions.get(gameId);
                if (session && session.state === 'voting') {
                    // Can't vote for yourself
                    if (votedFor === interaction.user.id) {
                        return await interaction.reply({ content: 'You can\'t vote for yourself!', ephemeral: true });
                    }
                    session.gameData.votes[interaction.user.id] = votedFor;
                    this.games.activeSessions.set(gameId, session);
                    return await interaction.reply({ content: '🔍 Vote recorded! Waiting for others...', ephemeral: true });
                }
            }

            // Word Heist skip
            if (customId.startsWith('wordheist_skip_')) {
                const gameId = customId.replace('wordheist_skip_', '');
                const session = this.games.activeSessions.get(gameId);
                if (session) {
                    return await this.games.handleWordHeistSkip(interaction, session);
                }
            }

            // Ranks pagination
            if (customId.startsWith('ranks_prev_') || customId.startsWith('ranks_next_')) {
                const parts = customId.split('_');
                const direction = parts[1]; // prev or next
                const gameFilter = parts[2];
                const currentPage = parseInt(parts[3]);
                const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
                
                // Re-run the ranks query with new page
                return await this.handleRanksPagination(interaction, gameFilter, newPage);
            }

            // Warns pagination
            if (customId.startsWith('warns_prev_') || customId.startsWith('warns_next_')) {
                const parts = customId.split('_');
                const direction = parts[1];
                const userFilter = parts[2];
                const currentPage = parseInt(parts[3]);
                const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
                return await this.handleWarnsPagination(interaction, userFilter, newPage);
            }

            // Bans pagination
            if (customId.startsWith('bans_prev_') || customId.startsWith('bans_next_')) {
                const parts = customId.split('_');
                const direction = parts[1];
                const currentPage = parseInt(parts[2]);
                const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
                return await this.handleBansPagination(interaction, newPage);
            }

            // Mutes pagination
            if (customId.startsWith('mutes_prev_') || customId.startsWith('mutes_next_')) {
                const parts = customId.split('_');
                const direction = parts[1];
                const activeFilter = parts[2];
                const currentPage = parseInt(parts[3]);
                const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
                return await this.handleMutesPagination(interaction, activeFilter, newPage);
            }

            // Cases pagination
            if (customId.startsWith('cases_prev_') || customId.startsWith('cases_next_')) {
                const parts = customId.split('_');
                const direction = parts[1];
                const userFilter = parts[2];
                const currentPage = parseInt(parts[3]);
                const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
                return await this.handleCasesPagination(interaction, userFilter, newPage);
            }

            // Audit log pagination
            if (customId.startsWith('auditlog_prev_') || customId.startsWith('auditlog_next_')) {
                const parts = customId.split('_');
                const direction = parts[1];
                const currentPage = parseInt(parts[2]);
                const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
                return await this.handleAuditLogPagination(interaction, newPage);
            }

            // Active users pagination
            if (customId.startsWith('activeusers_prev_') || customId.startsWith('activeusers_next_')) {
                const parts = customId.split('_');
                const direction = parts[1];
                const currentPage = parseInt(parts[2]);
                const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
                return await this.handleActiveUsersPagination(interaction, newPage);
            }

            // Listwords pagination
            if (customId.startsWith('listwords_prev_') || customId.startsWith('listwords_next_')) {
                return await this.handleListWordsButton(interaction);
            }

        } catch (error) {
            console.error('Game button error:', error);
            try {
                await interaction.reply({ content: 'Something went wrong with the game.', ephemeral: true });
            } catch {}
        }
    }

    // ===========================================
    // DOCUMENTATION COMMANDS
    // ===========================================

    async handleHelp(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📖 Barry Bot - Commands Guide')
            .setDescription('Here\'s everything I can do for you!')
            .addFields(
                { 
                    name: '🎮 Games', 
                    value: [
                        '`/game` - Start a game (Reflex, Mind Lock, Time Trap, etc.)',
                        '`/duel @user` - Challenge someone to a duel',
                        '`/daily` - Play today\'s daily challenge (once per day)',
                        '`/gamestats` - View your game statistics',
                        '`/achievements` - View your earned achievements',
                        '`/leaderboard` - See the top players'
                    ].join('\n'),
                    inline: false 
                },
                { 
                    name: '⏰ Reminders', 
                    value: [
                        '`/remindme <time> <message>` - Set a reminder',
                        '`/reminders` - View your active reminders'
                    ].join('\n'),
                    inline: false 
                },
                { 
                    name: '📝 Appeals', 
                    value: [
                        '`/appeal <case_id> <reason>` - Appeal a moderation action'
                    ].join('\n'),
                    inline: false 
                },
                { 
                    name: '💬 Chat with Barry', 
                    value: [
                        'Just mention **@Barry** or say **"Barry"** in chat!',
                        'I\'ll respond to direct mentions and replies to my messages.'
                    ].join('\n'),
                    inline: false 
                }
            )
            .setFooter({ text: 'Use /mod-help for moderator commands' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleModHelp(interaction) {
        const embed1 = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('🛡️ Barry Bot - Moderator Guide')
            .setDescription('Complete guide to all moderation commands')
            .addFields(
                { 
                    name: '⚖️ Moderation Actions', 
                    value: [
                        '`/warn @user <reason>` - Issue a warning',
                        '`/mute @user <duration> [reason]` - Timeout a user',
                        '`/unmute @user` - Remove a timeout',
                        '`/kick @user [reason]` - Kick from server',
                        '`/ban @user [reason] [days]` - Ban a user',
                        '`/unban <user_id>` - Unban a user'
                    ].join('\n'),
                    inline: false 
                },
                { 
                    name: '📋 Case Management', 
                    value: [
                        '`/case <case_id>` - View details of a specific case',
                        '`/cases @user` - View all cases for a user',
                        '`/warns [@user]` - View warnings list',
                        '`/bans` - View all bans',
                        '`/mutes [active]` - View mutes/timeouts'
                    ].join('\n'),
                    inline: false 
                },
                { 
                    name: '📝 Notes & Reports', 
                    value: [
                        '`/note @user <note>` - Add a private mod note',
                        '`/report @user` - View full user report',
                        '`/auditlog` - View recent mod actions'
                    ].join('\n'),
                    inline: false 
                }
            );

        const embed2 = new EmbedBuilder()
            .setColor(0xE74C3C)
            .addFields(
                { 
                    name: '🔧 Configuration', 
                    value: [
                        '`/personality` - Adjust Barry\'s personality (Admin)',
                        '`/setmode <mode>` - Set moderation mode (Admin)',
                        '`/set-mod-channel #channel` - Set mod logs channel (Admin)',
                        '`/mod-dm on/off` - Toggle DM alerts for mod events'
                    ].join('\n'),
                    inline: false 
                },
                { 
                    name: '📚 Word Filter', 
                    value: [
                        '`/addword <word> [severity] [action]` - Add filtered word',
                        '`/removeword <word>` - Remove a filtered word',
                        '`/listwords [filter]` - View all filtered words'
                    ].join('\n'),
                    inline: false 
                },
                { 
                    name: '🛡️ Active Users', 
                    value: [
                        '`/activeuser add @user` - Make user immune to auto-mod',
                        '`/activeuser remove @user` - Remove auto-mod immunity',
                        '`/activeuser list` - View all immune users'
                    ].join('\n'),
                    inline: false 
                },
                { 
                    name: '📊 Stats & Appeals', 
                    value: [
                        '`/serverstats` - View server moderation statistics',
                        '`/appeals` - View pending appeals',
                        '`/reviewappeal <id> <decision>` - Handle appeals'
                    ].join('\n'),
                    inline: false 
                }
            )
            .setFooter({ text: 'Barry Bot • Keeping servers safe since day one' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed1, embed2], ephemeral: true });
    }

    // ===========================================
    // MOD DM & CHANNEL SETTINGS
    // ===========================================

    async handleModDm(interaction) {
        const action = interaction.options.getString('action');
        const modId = interaction.user.id;
        const guildId = interaction.guild.id;

        if (action === 'status') {
            const settings = await this.database.getServerSettings(guildId);
            const enabled = settings.modDmSubscribers?.includes(modId) || false;
            
            return await interaction.reply({
                embeds: [{
                    color: enabled ? 0x2ECC71 : 0xE74C3C,
                    title: `📬 Mod DM Notifications: ${enabled ? 'ON' : 'OFF'}`,
                    description: enabled 
                        ? 'You will receive DMs for moderation events (spam, bans, suspicious activity).'
                        : 'You will NOT receive DM notifications. Use `/mod-dm on` to enable.',
                    timestamp: new Date().toISOString()
                }],
                ephemeral: true
            });
        }

        const enable = action === 'on';
        await this.database.toggleModDm(guildId, modId, enable);

        await interaction.reply({
            embeds: [{
                color: enable ? 0x2ECC71 : 0xE74C3C,
                title: enable ? '✅ DM Notifications Enabled' : '❌ DM Notifications Disabled',
                description: enable 
                    ? 'You will now receive DMs when:\n• Users are banned/muted\n• Spam is detected\n• Suspicious links are shared'
                    : 'You will no longer receive mod DM notifications.',
                timestamp: new Date().toISOString()
            }],
            ephemeral: true
        });
    }

    async handleSetModChannel(interaction) {
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;

        // Verify it's a text channel
        if (channel.type !== 0) {
            return await interaction.reply({ 
                content: 'Please select a text channel.', 
                ephemeral: true 
            });
        }

        await this.database.setModLogChannel(guildId, channel.id);

        await interaction.reply({
            embeds: [{
                color: 0x2ECC71,
                title: '✅ Mod Log Channel Set',
                description: `All moderation logs will now be sent to ${channel}.`,
                fields: [
                    { name: 'Channel', value: `<#${channel.id}>`, inline: true },
                    { name: 'Set By', value: interaction.user.tag, inline: true }
                ],
                timestamp: new Date().toISOString()
            }]
        });
    }
}

module.exports = CommandHandler;