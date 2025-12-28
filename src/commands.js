const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const DatabaseHandler = require('./database');
const reminders = require('./reminders');

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
                .setName('alert')
                .setDescription('Send an alert about rule-adjacent behavior')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for the alert')
                        .setRequired(true)
                ),
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
                case 'remindme':
                    await this.handleRemindMe(interaction);
                    break;
                case 'reminders':
                    await this.handleReminders(interaction);
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
        // Use the same AI logic as normal Barry replies for consistency
        const PersonalityHandler = require('./ai-personality');
        const personality = new PersonalityHandler();
        // Simulate a message object for context
        const fakeMessage = {
            author: interaction.user,
            content: question
        };
        // Gather recent context (last 8 messages in the channel, if possible)
        let context = [];
        try {
            if (interaction.channel && interaction.channel.messages) {
                const channelMessages = await interaction.channel.messages.fetch({ limit: 10 });
                context = Array.from(channelMessages.values())
                    .filter(m => m.id !== interaction.id)
                    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                    .map(m => ({ author: m.author.username, content: m.content }));
            }
        } catch {}
        // Get user profile and mod status
        let userProfile = {};
        let isMod = false;
        let channelType = 'general';
        let timeOfDay = 'day';
        try {
            userProfile = await this.database.getUserData(interaction.user.id, interaction.guild.id);
            isMod = interaction.member?.permissions?.has('ModerateMembers') || false;
            channelType = interaction.channel?.name?.includes('mod') ? 'mods' : 'general';
            const hour = new Date().getHours();
            timeOfDay = hour >= 22 || hour < 6 ? 'latenight' : 'day';
        } catch {}
        // Use the same maturity logic as normal replies
        const maturity = 2;
        let aiReply = "Sorry, I can't answer that right now. Try again later.";
        try {
            aiReply = await personality.generateResponse(
                fakeMessage,
                context,
                channelType,
                userProfile,
                isMod,
                timeOfDay,
                maturity
            );
            if (!aiReply) aiReply = "Sorry, I can't answer that right now. Try again later.";
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
            .setTitle(`Report for ${user.tag}`)
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
            .setTitle('Note Added')
            .setDescription(`Added note for ${user.tag}: "${note}"`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handleServerStats(interaction) {
        const stats = await this.database.getServerStats(interaction.guild.id);
        const guild = interaction.guild;
        // Fallbacks for undefined/null stats
        const safe = (v) => (typeof v === 'number' && !isNaN(v) ? v.toString() : '0');
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`📊 Server Statistics for ${guild.name}`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: 'Total Members', value: safe(guild.memberCount), inline: true },
                { name: 'Online Members', value: safe(guild.members?.cache?.filter(m => m.presence?.status !== 'offline').size), inline: true },
                { name: 'Tracked Users', value: safe(stats?.totalUsers), inline: true },
                { name: 'Actions Today', value: safe(stats?.actionsToday), inline: true },
                { name: 'Actions This Week', value: safe(stats?.actionsThisWeek), inline: true },
                { name: 'Bans This Week', value: safe(stats?.bansThisWeek), inline: true },
                { name: 'Timeouts This Week', value: safe(stats?.mutesThisWeek), inline: true },
                { name: 'Warnings This Week', value: safe(stats?.warningsThisWeek), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
    }

    async handleOptOutCheckins(interaction) {
        this.database.optOutCheckins(interaction.user.id, interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Opted Out')
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

        // Update user strikes, ensure valid number
        let userData = await this.database.getUserData(user.id, interaction.guild.id);
        let strikes = (typeof userData.strikes === 'number' && !isNaN(userData.strikes)) ? userData.strikes : 0;
        strikes++;
        await this.database.updateUserStrikes(user.id, interaction.guild.id, strikes);

        // Log the action
        await this.database.logAction({
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
            .addFields({ name: 'Strikes', value: strikes.toString(), inline: true })
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

            // Update user strikes, ensure valid number
            let userData = await this.database.getUserData(user.id, interaction.guild.id);
            let strikes = (typeof userData.strikes === 'number' && !isNaN(userData.strikes)) ? userData.strikes : 0;
            strikes++;
            await this.database.updateUserStrikes(user.id, interaction.guild.id, strikes);

            // Log the action
            await this.database.logAction({
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
                .addFields({ name: 'Strikes', value: strikes.toString(), inline: true })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to timeout user:', error);
            await interaction.reply({ content: 'Failed to timeout user!', ephemeral: true });
        }
    }

    async handleInactiveUsers(interaction) {
        // Use MongoDB to get inactive users
        const daysInactive = 1;
        const inactiveList = await this.database.getInactiveUsers(interaction.guild.id, daysInactive);
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
        // Prepare pretty embed
        const alertColors = [0xe74c3c, 0xf39c12, 0x8e44ad, 0x16a085, 0x2980b9];
        const alertEmojis = ['🚨'];
        const color = alertColors[Math.floor(Math.random() * alertColors.length)];
        const emoji = alertEmojis[Math.floor(Math.random() * alertEmojis.length)];
        const alertEmbed = {
            color,
            title: `${emoji} Alert: Community Behavior`,
            description: `**${reason}**\n\nPlease review and discuss with fellow staff if this needs action or attention. Stay proactive and keep our community safe and welcoming!`,
            fields: [
            { name: 'Reported By', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Server', value: guild.name, inline: true }
            ],
            footer: { text: 'Barry Bot Alert' },
            timestamp: new Date()
        };
        // DM all mods
        for (const member of staffMembers.values()) {
            try {
                await member.send({ embeds: [alertEmbed] });
            } catch {}
        }
        // Send to #barry-mods (no mention)
        if (modChannel) {
            await modChannel.send({ embeds: [alertEmbed] });
        }
        await interaction.reply({ content: 'Alert sent to all mods.', flags: 64 });
    }

    async handleRemindMe(interaction) {
        const timeStr = interaction.options.getString('time');
        const message = interaction.options.getString('message');
        const repeatStr = interaction.options.getString('repeat');
        const privacy = (interaction.options.getString('privacy') || 'public').toLowerCase();
        const userId = interaction.user.id;
        const channelId = interaction.channelId;
        const now = Date.now();
        const ms = this.parseTime(timeStr);
        if (!ms || ms < 1000) {
            await interaction.reply({ content: 'Invalid time format. Use formats like 10m, 2h, 1d.', flags: 64 });
            return;
        }
        let repeatMs = null;
        if (repeatStr) {
            repeatMs = this.parseRepeat(repeatStr);
            if (!repeatMs) {
                await interaction.reply({ content: 'Invalid repeat format. Use formats like every day, every 8h.', flags: 64 });
                return;
            }
        }
        const remindAt = now + ms;
        // Generate a unique reminder_id
        const reminder_id = `${userId}-${Date.now()}-${Math.floor(Math.random()*10000)}`;
        const reminder = {
            id: reminder_id,
            userId: userId,
            channelId: channelId,
            privacy: privacy === 'private' ? 'private' : 'public',
            message: message,
            time: remindAt,
            repeat: repeatMs
        };
        await reminders.addReminder(reminder);
        const colors = [0x2ecc71, 0xf1c40f, 0x9b59b6, 0x1abc9c, 0xe67e22, 0x3498db];
        const emojis = ['⏰', '🦄', '🌈', '✨', '🎉', '🍀', '💡', '📅'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${emoji} Reminder Set`)
            .setDescription(`**${message}**`)
            .addFields(
                { name: 'Time', value: `<t:${Math.floor(remindAt/1000)}:F>`, inline: true },
                { name: 'Repeat', value: repeatMs ? repeatStr : 'No', inline: true },
                { name: 'Type', value: privacy, inline: true },
                { name: 'Reminder ID', value: reminder_id, inline: false }
            )
            .setFooter({ text: `Barry Bot` })
            .setTimestamp(new Date(remindAt));
        await interaction.reply({ embeds: [embed], flags: 64 });
    }

    async handleReminders(interaction) {
        const userId = interaction.user.id;
        const action = interaction.options.getString('action') || 'list';
        const id = interaction.options.getString('id');
        const value = interaction.options.getString('value');
        const targetUser = interaction.options.getUser ? interaction.options.getUser('user') : null;
        const modRoleIds = process.env.BARRY_MOD_ROLE_IDS ? process.env.BARRY_MOD_ROLE_IDS.split(',') : [];
        const memberRoles = interaction.member?.roles?.cache ? Array.from(interaction.member.roles.cache.keys()) : [];
        const isMod = interaction.member?.permissions?.has(PermissionsBitField.Flags.ModerateMembers) || memberRoles.some(rid => modRoleIds.includes(rid));
        let viewUserId = userId;
        if (targetUser) viewUserId = targetUser.id;
        if (action === 'list') {
            let allReminders = await reminders.loadReminders();
            let visibleReminders;
            if (viewUserId === userId || isMod) {
                visibleReminders = allReminders.filter(r => r.userId === viewUserId);
            } else {
                await interaction.reply({ content: 'You do not have permission to view these reminders.', flags: 64 });
                return;
            }
            if (!visibleReminders.length) {
                await interaction.reply({ content: 'No active reminders found.', flags: 64 });
                return;
            }
            const colors = [0x2ecc71, 0xf1c40f, 0x9b59b6, 0x1abc9c, 0xe67e22, 0x3498db];
            const emojis = ['🔔', '⏰', '🦄', '🌈', '✨', '🎉', '🍀', '💡', '📅'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const emoji = emojis[Math.floor(Math.random() * emojis.length)];
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`${emoji} Reminders for <@${viewUserId}>`)
                .setDescription('Active reminders:')
                .addFields(
                    ...visibleReminders.map((r, i) => ({
                        name: `${i+1}. [${r.privacy ? r.privacy.toUpperCase() : 'REMINDER'}] <t:${Math.floor((r.time || Date.now())/1000)}:F>`,
                        value: `**${r.message}**\nID: ${r.id}`,
                        inline: false
                    }))
                )
                .setFooter({ text: `Barry Bot` })
                .setTimestamp();
            await interaction.reply({ embeds: [embed], flags: 64 });
        } else if (action === 'cancel' && id) {
            let r = await reminders.getReminderById(id);
            if (!r || (r.userId !== userId && !isMod)) {
                await interaction.reply({ content: 'Reminder not found or permission denied.', flags: 64 });
                return;
            }
            await reminders.removeReminder(id);
            await interaction.reply({ content: 'Reminder cancelled.', flags: 64 });
        } else if (action === 'edit' && id && value) {
            let r = await reminders.getReminderById(id);
            if (!r || r.userId !== userId) {
                await interaction.reply({ content: 'Reminder not found.', flags: 64 });
                return;
            }
            r.message = value;
            await reminders.updateReminder(r);
            await interaction.reply({ content: 'Reminder updated.', flags: 64 });
        } else if (action === 'snooze' && id && value) {
            let r = await reminders.getReminderById(id);
            if (!r || r.userId !== userId) {
                await interaction.reply({ content: 'Reminder not found.', flags: 64 });
                return;
            }
            const ms = this.parseTime(value);
            if (!ms) {
                await interaction.reply({ content: 'Invalid snooze time.', flags: 64 });
                return;
            }
            r.time = Date.now() + ms;
            await reminders.updateReminder(r);
            await interaction.reply({ content: 'Reminder snoozed.', flags: 64 });
        } else {
            await interaction.reply({ content: 'Invalid action or missing parameters.', flags: 64 });
        }
    }

    parseRepeat(str) {
        // Accepts formats like 'every day', 'every 8h', 'every 30m'
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

    parseTime(str) {
        // Supports formats like 10m, 2h, 1d
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

    formatDuration(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));

        let duration = '';
        if (days > 0) duration += `${days}d `;
        if (hours > 0) duration += `${hours}h `;
        if (minutes > 0) duration += `${minutes}m `;
        if (seconds > 0) duration += `${seconds}s`;

        return duration.trim();
    }
}

module.exports = CommandHandler;