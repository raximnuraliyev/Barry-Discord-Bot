const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const DatabaseHandler = require('./database');
const fs = require('fs');
const path = require('path');

class CommandHandler {
    constructor() {
        this.database = new DatabaseHandler();
        this.commands = [
            new SlashCommandBuilder()
                .setName('askbarry')
                .setDescription('Ask Barry a question')
                .addStringOption(option =>
                    option.setName('question')
                        .setDescription('Your question for Barry')
                        .setRequired(true)
                ),
            
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
                ),
            
            new SlashCommandBuilder()
                .setName('serverstats')
                .setDescription('View server statistics')
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
            
            new SlashCommandBuilder()
                .setName('optoutcheckins')
                .setDescription('Opt out of inactivity check-ins'),
            
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
                .setName('timeout')
                .setDescription('Timeout a user')
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
            
            new SlashCommandBuilder()
                .setName('inactiveusers')
                .setDescription('Show the list of currently inactive users (mods only)')
                .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
            
            new SlashCommandBuilder()
                .setName('alert')
                .setDescription('Send an alert about rule-adjacent behavior')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for the alert')
                        .setRequired(true)
                ),
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
                case 'askbarry':
                    await this.handleAskBarry(interaction);
                    break;
                case 'report':
                    await this.handleReport(interaction);
                    break;
                case 'note':
                    await this.handleNote(interaction);
                    break;
                case 'serverstats':
                    await this.handleServerStats(interaction);
                    break;
                case 'optoutcheckins':
                    await this.handleOptOutCheckins(interaction);
                    break;
                case 'warn':
                    await this.handleWarn(interaction);
                    break;
                case 'timeout':
                    await this.handleTimeout(interaction);
                    break;
                case 'inactiveusers':
                    await this.handleInactiveUsers(interaction);
                    break;
                case 'alert':
                    await this.handleAlert(interaction);
                    break;
                default:
                    await interaction.reply({ content: 'Unknown command!', ephemeral: true });
            }
        } catch (error) {
            console.error('Command error:', error);
            await interaction.reply({ content: 'Something went wrong!', ephemeral: true });
        }
    }

    async handleAskBarry(interaction) {
        const question = interaction.options.getString('question');
        const fs = require('fs');
        const path = require('path');
        const { EmbedBuilder } = require('discord.js');

        // Load Barry's personality prompt
        const personalityPath = path.join(__dirname, '../barry-personality.json');
        let personality;
        try {
            personality = JSON.parse(fs.readFileSync(personalityPath, 'utf8'));
        } catch (e) {
            personality = { description: "Barry is a dry, witty, sarcastic, and sometimes caring Canadian Discord bot." };
        }

        // Prepare prompt for AI
        const prompt = `You are Barry, a Discord bot.\nPersonality: ${personality.description}\nTraits: ${personality.personality ? personality.personality.join(', ') : ''}\nCatchphrases: ${personality.catchphrases ? personality.catchphrases.join(' ') : ''}\n\nUser: ${question}\nBarry:`;

        // Call OpenRouter API
        const axios = require('axios');
        let aiReply = personality.catchphrases ? personality.catchphrases[0] : "Boom.";
        try {
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: 'gpt-4o', // Change if you want a different model from OpenRouter
                    messages: [
                        { role: 'system', content: prompt },
                        { role: 'user', content: question }
                    ],
                    max_tokens: 100,
                    temperature: 0.7
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            aiReply = response.data.choices[0].message.content.trim();
        } catch (err) {
            console.error('OpenRouter API error:', err?.response?.data || err.message || err);
            aiReply = "Sorry, I can't answer that right now. Try again later.";
        }

        // Build embed (no emojis)
        const embed = new EmbedBuilder()
            .setColor(0x2d3136)
            .setTitle('Barry says:')
            .setDescription(aiReply)
            .setFooter({ text: 'Ask Barry anything. He might answer.' });

        await interaction.reply({ embeds: [embed] });
    }

    async handleReport(interaction) {
        const user = interaction.options.getUser('user');
        const userData = this.database.getUserData(user.id, interaction.guild.id);
        const actions = this.database.getUserActions(user.id, interaction.guild.id);
        const notes = this.database.getUserNotes(user.id, interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`📋 Report for ${user.tag}`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: 'User ID', value: user.id, inline: true },
                { name: 'Current Strikes', value: userData.strikes.toString(), inline: true },
                { name: 'Last Activity', value: `<t:${Math.floor(userData.lastActivity / 1000)}:R>`, inline: true },
                { name: 'Total Actions', value: actions.length.toString(), inline: true },
                { name: 'Notes', value: notes.length.toString(), inline: true }
            )
            .setTimestamp();

        if (actions.length > 0) {
            const recentActions = actions.slice(-5).map(action => 
                `${action.action.toUpperCase()} - ${action.reason} (${new Date(action.timestamp).toLocaleDateString()})`
            );
            embed.addFields({ name: 'Recent Actions', value: recentActions.join('\n') || 'None', inline: false });
        }

        if (notes.length > 0) {
            const recentNotes = notes.slice(-3).map(note => 
                `${note.note} - ${note.moderator} (${new Date(note.timestamp).toLocaleDateString()})`
            );
            embed.addFields({ name: 'Recent Notes', value: recentNotes.join('\n') || 'None', inline: false });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleNote(interaction) {
        const user = interaction.options.getUser('user');
        const note = interaction.options.getString('note');
        
        this.database.addNote(user.id, interaction.guild.id, note, interaction.user.tag);
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Note Added')
            .setDescription(`Added note for ${user.tag}: "${note}"`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleServerStats(interaction) {
        const stats = this.database.getServerStats(interaction.guild.id);
        const guild = interaction.guild;
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`📊 Server Statistics for ${guild.name}`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: 'Total Members', value: guild.memberCount.toString(), inline: true },
                { name: 'Online Members', value: guild.members.cache.filter(m => m.presence?.status !== 'offline').size.toString(), inline: true },
                { name: 'Tracked Users', value: stats.totalUsers.toString(), inline: true },
                { name: 'Actions Today', value: stats.actionsToday.toString(), inline: true },
                { name: 'Actions This Week', value: stats.actionsThisWeek.toString(), inline: true },
                { name: 'Bans This Week', value: stats.bansThisWeek.toString(), inline: true },
                { name: 'Timeouts This Week', value: stats.mutesThisWeek.toString(), inline: true },
                { name: 'Warnings This Week', value: stats.warningsThisWeek.toString(), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleOptOutCheckins(interaction) {
        this.database.optOutCheckins(interaction.user.id, interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Opted Out')
            .setDescription('You have been opted out of inactivity check-ins.')
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleWarn(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const member = interaction.guild.members.cache.get(user.id);
        
        if (!member) {
            await interaction.reply({ content: 'User not found in this server!', ephemeral: true });
            return;
        }

        // Update user strikes
        const userData = this.database.getUserData(user.id, interaction.guild.id);
        this.database.updateUserStrikes(user.id, interaction.guild.id, userData.strikes + 1);

        // Log the action
        this.database.logAction({
            userId: user.id,
            guildId: interaction.guild.id,
            action: 'warn',
            reason: reason,
            moderator: interaction.user.tag,
            timestamp: new Date().toISOString()
        });

        const embed = new EmbedBuilder()
            .setColor(0xFFFF00)
            .setTitle('⚠️ User Warned')
            .setDescription(`${user.tag} has been warned.\nReason: ${reason}`)
            .addFields({ name: 'Strikes', value: (userData.strikes + 1).toString(), inline: true })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async handleTimeout(interaction) {
        const user = interaction.options.getUser('user');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason');
        const member = interaction.guild.members.cache.get(user.id);
        
        if (!member) {
            await interaction.reply({ content: 'User not found in this server!', ephemeral: true });
            return;
        }

        try {
            await member.timeout(duration * 60 * 1000, reason);
            
            // Log the action
            this.database.logAction({
                userId: user.id,
                guildId: interaction.guild.id,
                action: 'timeout',
                reason: reason,
                moderator: interaction.user.tag,
                timestamp: new Date().toISOString(),
                duration: duration * 60 * 1000
            });

            const embed = new EmbedBuilder()
                .setColor(0xFF8C00)
                .setTitle('🔇 User Timed Out')
                .setDescription(`${user.tag} has been timed out for ${duration} minutes.\nReason: ${reason}`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to timeout user:', error);
            await interaction.reply({ content: 'Failed to timeout user!', ephemeral: true });
        }
    }

    async handleInactiveUsers(interaction) {
        const staffRoleId = process.env.BARRY_STAFF_ROLE_ID || null;
        const inactivePath = path.join(__dirname, '../inactive-users.json');
        let inactiveList = [];
        try {
            inactiveList = JSON.parse(fs.readFileSync(inactivePath, 'utf8'));
        } catch {
            inactiveList = [];
        }
        if (!inactiveList.length) {
            await interaction.reply({ content: 'There are no inactive users in the last 24h.', flags: 64 });
            return;
        }
        const userList = inactiveList.map(u => `<@${u.userId}>`).join(', ');
        const embed = new EmbedBuilder()
            .setColor(0x7289da)
            .setTitle('Inactive Users (last 24h)')
            .setDescription(userList)
            .setTimestamp();
        await interaction.reply({ embeds: [embed], flags: 64 });
    }

    async handleAlert(interaction) {
        const reason = interaction.options.getString('reason');
        const guild = interaction.guild;
        const staffRoleId = process.env.BARRY_STAFF_ROLE_ID || null;
        const staffRole = staffRoleId ? guild.roles.cache.get(staffRoleId) : null;
        const modChannel = guild.channels.cache.find(ch => ch.name === 'barry-mods' && ch.type === 0);
        const staffMembers = staffRole ? staffRole.members : guild.members.cache.filter(m => m.permissions.has(PermissionsBitField.Flags.ModerateMembers));
        // Load rules summary from README
        let rulesSummary = 'Please review our server rules.';
        try {
            const readme = fs.readFileSync(path.join(__dirname, '../README.md'), 'utf8');
            const rulesSection = readme.split('## Features')[1]?.split('---')[0];
            if (rulesSection) rulesSummary = "Server Rules: " + rulesSection.trim();
        } catch {}
        // DM all mods
        for (const member of staffMembers.values()) {
            try {
                await member.send(`ALERT: Rule-adjacent behavior reported.\nReason: ${reason}\n${rulesSummary}`);
            } catch {}
        }
        // Tag mods in #barry-mods
        if (modChannel) {
            const staffPing = staffRoleId ? `<@&${staffRoleId}>` : '@here';
            await modChannel.send({
                content: `${staffPing} ALERT: Rule-adjacent behavior reported.\nReason: ${reason}\n${rulesSummary}`
            });
        }
        await interaction.reply({ content: 'Alert sent to all mods.', flags: 64 });
    }
}

module.exports = CommandHandler;