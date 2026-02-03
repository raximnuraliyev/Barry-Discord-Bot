const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const DatabaseHandler = require("./database");
const PersonalityHandler = require("./ai-personality");

/**
 * ModerationHandler - Barry's Smart Moderation System
 * 
 * Layer 1 (Rules): Dynamic offensive words, severity levels, configurable thresholds
 * Layer 2 (AI): Context-aware moderation, AI explanations, tone detection
 * Layer 3 (Memory): Case system, audit trail, appeals, progressive punishment
 */
class ModerationHandler {
    constructor() {
        this.database = new DatabaseHandler();
        this.personality = new PersonalityHandler();
        this.joinTimes = new Map();
        this.recentJoins = [];
        
        // Cache for offensive words (refreshed periodically)
        this.offensiveWordsCache = new Map(); // guildId -> words[]
        this.cacheExpiry = new Map(); // guildId -> expiry timestamp
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get offensive words from DB (with caching)
     */
    async getOffensiveWords(guildId) {
        const now = Date.now();
        const expiry = this.cacheExpiry.get(guildId) || 0;
        
        if (now < expiry && this.offensiveWordsCache.has(guildId)) {
            return this.offensiveWordsCache.get(guildId);
        }

        // Fetch from database
        let words = await this.database.getOffensiveWords(guildId);
        
        // If no words configured, seed defaults
        if (!words || words.length === 0) {
            await this.database.seedDefaultOffensiveWords(guildId);
            words = await this.database.getOffensiveWords(guildId);
        }

        this.offensiveWordsCache.set(guildId, words);
        this.cacheExpiry.set(guildId, now + this.cacheDuration);
        
        return words;
    }

    /**
     * Clear cache for a guild (call after adding/removing words)
     */
    clearCache(guildId) {
        this.offensiveWordsCache.delete(guildId);
        this.cacheExpiry.delete(guildId);
    }

    /**
     * Main message check - Layer 1 rules + Layer 2 context
     */
    async checkMessage(message) {
        if (!message.guild) return;
        
        const guildId = message.guild.id;
        const content = message.content.toLowerCase();
        const settings = await this.database.getServerSettings(guildId);

        // Skip if auto-moderation is disabled
        if (!settings.features?.autoModeration) return;

        // Skip if user is an "active user" (immune to auto-mod)
        const isActiveUser = await this.database.isActiveUser(guildId, message.author.id);
        if (isActiveUser) return;

        // Get user profile for context-aware decisions
        const userProfile = await this.database.getUserData(message.author.id, guildId);

        // Check for offensive words (from DB, not hardcoded)
        const offensiveWords = await this.getOffensiveWords(guildId);
        for (const wordDoc of offensiveWords) {
            const matched = this.matchWord(content, wordDoc);
            if (matched) {
                await this.handleOffensiveContent(message, wordDoc, userProfile, settings);
                return;
            }
        }

        // Check for spam
        if (settings.features?.spamDetection) {
            await this.checkSpam(message, userProfile, settings);
        }

        // Check for invite links (except for owner/mods)
        if (this.containsInviteLinks(content)) {
            const isOwner = message.author.id === message.guild.ownerId;
            const isMod = message.member?.permissions?.has(PermissionsBitField.Flags.ModerateMembers);
            if (!(isOwner || isMod)) {
                await this.handleInviteLink(message, userProfile, settings);
            }
        }
    }

    /**
     * Match word based on match type (exact, partial, regex)
     */
    matchWord(content, wordDoc) {
        const word = wordDoc.word.toLowerCase();
        switch (wordDoc.matchType) {
            case 'exact':
                // Word boundaries
                const exactRegex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'i');
                return exactRegex.test(content);
            case 'regex':
                try {
                    const regex = new RegExp(word, 'i');
                    return regex.test(content);
                } catch {
                    return content.includes(word);
                }
            case 'partial':
            default:
                return content.includes(word);
        }
    }

    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Handle offensive content with progressive punishment
     */
    async handleOffensiveContent(message, wordDoc, userProfile, settings) {
        const userId = message.author.id;
        const guildId = message.guild.id;
        const severity = wordDoc.severity || 'medium';
        const defaultAction = wordDoc.defaultAction || 'warn';

        // Delete the message (always)
        try {
            await message.delete();
        } catch (error) {
            console.error("Failed to delete message:", error);
        }

        // Get severity trend for progressive punishment
        const severityTrend = await this.database.getSeverityTrend(userId, guildId);
        const recentWarnings = await this.database.getRecentWarnings(userId, guildId, 24);
        const thresholds = settings.punishmentThresholds || {};

        // Determine action based on severity + history
        let action = defaultAction;
        let duration = null;
        let severityScore = this.calculateSeverityScore(severity, recentWarnings, severityTrend);

        // Progressive punishment logic
        const warnsForMute = {
            low: thresholds.lowWarnsForMute || 3,
            medium: thresholds.mediumWarnsForMute || 2,
            high: thresholds.highWarnsForMute || 1
        };

        // High severity = immediate escalation
        if (severity === 'high') {
            action = 'mute';
            duration = (thresholds.muteDurationMinutes?.[0] || 30) * 60 * 1000;
        } 
        // Check if user exceeded warning threshold for this severity
        else if (recentWarnings.filter(w => w.severity === severity).length >= warnsForMute[severity]) {
            action = 'mute';
            const muteIndex = Math.min(recentWarnings.length, (thresholds.muteDurationMinutes?.length || 8) - 1);
            duration = (thresholds.muteDurationMinutes?.[muteIndex] || 30) * 60 * 1000;
        }
        // Escalating trend = stricter
        else if (severityTrend.trend === 'escalating' && recentWarnings.length >= 2) {
            action = 'mute';
            duration = (thresholds.muteDurationMinutes?.[0] || 15) * 60 * 1000;
        }

        // Trusted users get softer treatment
        if ((userProfile.trustLevel || 0) > 3 && action === 'mute' && severity !== 'high') {
            action = 'warn';
            duration = null;
        }

        // Generate AI explanation
        const aiExplanation = await this.personality.generatePunishmentExplanation(
            action,
            `Use of "${wordDoc.word}"`,
            severity,
            recentWarnings,
            settings
        );

        // Create case
        const caseData = {
            guildId,
            userId,
            action,
            reason: `Offensive language: "${wordDoc.word}"`,
            aiExplanation,
            messageContent: message.content.substring(0, 500),
            messageId: message.id,
            channelId: message.channel.id,
            severity,
            severityScore,
            moderator: 'Barry (Auto)',
            automated: true,
            duration
        };

        if (duration) {
            caseData.expiresAt = new Date(Date.now() + duration);
        }

        const moderationCase = await this.database.createCase(caseData);

        // Add warning to user
        await this.database.addUserWarning(userId, guildId, {
            reason: caseData.reason,
            severity,
            moderator: 'Barry (Auto)',
            aiExplanation,
            caseId: moderationCase.caseId
        });

        // Execute action
        if (action === 'warn') {
            await this.sendWarning(message, aiExplanation, moderationCase.caseId, settings);
        } else if (action === 'mute') {
            await this.executeMute(message, duration, aiExplanation, moderationCase.caseId, settings);
        } else if (action === 'escalate') {
            await this.escalateToMods(message, wordDoc, userProfile, moderationCase);
        }

        // Send to mod log
        await this.sendToModLog(message.guild, {
            action,
            user: message.author,
            reason: caseData.reason,
            moderator: 'Barry (Auto)',
            severity,
            severityScore,
            aiExplanation,
            caseId: moderationCase.caseId,
            duration
        }, settings);

        // Update user trust (negative interaction)
        await this.database.recordInteraction(userId, guildId, false);
        await this.database.updateTrustLevel(userId, guildId, severity === 'high' ? -2 : -1);
    }

    /**
     * Calculate severity score (0-100)
     */
    calculateSeverityScore(severity, recentWarnings, trend) {
        const baseScores = { low: 20, medium: 50, high: 80 };
        let score = baseScores[severity] || 50;
        
        // Add for recent warnings
        score += recentWarnings.length * 5;
        
        // Add for escalating trend
        if (trend.trend === 'escalating') score += 15;
        else if (trend.trend === 'moderate') score += 5;

        return Math.min(100, score);
    }

    /**
     * Send warning (respects silent/strict mode)
     */
    async sendWarning(message, explanation, caseId, settings) {
        const mode = settings.moderationMode || 'hybrid';
        
        if (mode === 'silent') {
            // DM only
            try {
                await message.author.send({
                    embeds: [this.createWarningEmbed(explanation, caseId)]
                });
            } catch {}
            return;
        }

        // Public warning
        const embed = this.createWarningEmbed(explanation, caseId);
        await message.channel.send({ 
            content: `${message.author}`,
            embeds: [embed] 
        });
    }

    createWarningEmbed(explanation, caseId) {
        return new EmbedBuilder()
            .setColor(0xFFFF00)
            .setTitle("Warning")
            .setDescription(explanation)
            .setFooter({ text: `Case #${caseId}` })
            .setTimestamp();
    }

    /**
     * Execute mute/timeout
     */
    async executeMute(message, duration, explanation, caseId, settings) {
        try {
            await message.member.timeout(duration, explanation);
            await this.database.muteUser(message.author.id, message.guild.id, duration);

            const mode = settings.moderationMode || 'hybrid';
            
            if (mode !== 'silent') {
                const embed = new EmbedBuilder()
                    .setColor(0xFF8C00)
                    .setTitle("User Timed Out")
                    .setDescription(`${message.author} has been timed out for ${this.formatDuration(duration)}.\n\n${explanation}`)
                    .setFooter({ text: `Case #${caseId}` })
                    .setTimestamp();

                await message.channel.send({ embeds: [embed] });
            }

            // DM the user
            try {
                await message.author.send({
                    embeds: [{
                        color: 0xFF8C00,
                        title: `You've been timed out in ${message.guild.name}`,
                        description: `Duration: ${this.formatDuration(duration)}\n\n${explanation}`,
                        footer: { text: `Case #${caseId} • You can appeal with /appeal ${caseId}` }
                    }]
                });
            } catch {}
        } catch (error) {
            console.error("Failed to timeout user:", error);
        }
    }

    /**
     * Escalate to moderators
     */
    async escalateToMods(message, wordDoc, userProfile, moderationCase) {
        const modChannel = await this.getModChannel(message.guild);
        if (!modChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle("Escalation Required")
            .setDescription(`User ${message.author.tag} used high-severity content requiring review.`)
            .addFields(
                { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: 'Trust Level', value: `${userProfile.trustLevel || 0}`, inline: true },
                { name: 'Previous Warnings', value: `${(userProfile.warnings || []).length}`, inline: true },
                { name: 'Triggered Word', value: `||${wordDoc.word}||`, inline: true },
                { name: 'Severity', value: wordDoc.severity, inline: true },
                { name: 'Case ID', value: moderationCase.caseId, inline: true },
                { name: 'Channel', value: `<#${message.channel.id}>`, inline: true }
            )
            .setTimestamp();

        await modChannel.send({ 
            content: '@here Review needed',
            embeds: [embed] 
        });
    }

    /**
     * Check for spam
     */
    async checkSpam(message, userProfile, settings) {
        const userId = message.author.id;
        const content = message.content;
        const guildId = message.guild.id;

        if (userProfile.lastMessage === content && userProfile.lastMessageTime) {
            const timeDiff = Date.now() - userProfile.lastMessageTime;
            if (timeDiff < 5000) {
                await this.handleSpam(message, userProfile, settings);
                return;
            }
        }

        await this.database.updateUserData(userId, guildId, {
            lastMessage: content,
            lastMessageTime: Date.now()
        });
    }

    /**
     * Handle spam with progressive punishment
     */
    async handleSpam(message, userProfile, settings) {
        await message.delete();
        
        const userId = message.author.id;
        const guildId = message.guild.id;
        const spamStrikes = userProfile.spamStrikes || 0;

        let action = "warn";
        let duration = null;
        const thresholds = settings.punishmentThresholds || {};
        const muteDurations = thresholds.muteDurationMinutes || [1, 5, 15, 30, 60];

        if (spamStrikes === 0) {
            action = "warn";
        } else if (spamStrikes < muteDurations.length) {
            action = "mute";
            duration = muteDurations[spamStrikes] * 60 * 1000;
        } else {
            action = "escalate";
        }

        const aiExplanation = await this.personality.generatePunishmentExplanation(
            action,
            "Spam detected",
            "medium",
            [],
            settings
        );

        const moderationCase = await this.database.createCase({
            guildId,
            userId,
            action,
            reason: "Spam detected",
            aiExplanation,
            severity: 'medium',
            moderator: 'Barry (Auto)',
            automated: true,
            duration
        });

        if (action === "warn") {
            await this.sendWarning(message, aiExplanation, moderationCase.caseId, settings);
        } else if (action === "mute") {
            await this.executeMute(message, duration, aiExplanation, moderationCase.caseId, settings);
        } else if (action === "escalate") {
            await this.escalateToMods(message, { word: 'SPAM', severity: 'high' }, userProfile, moderationCase);
        }

        await this.database.updateUserData(userId, guildId, {
            spamStrikes: spamStrikes + 1
        });

        await this.sendToModLog(message.guild, {
            action,
            user: message.author,
            reason: "Spam detected",
            moderator: 'Barry (Auto)',
            aiExplanation,
            caseId: moderationCase.caseId,
            duration
        }, settings);
    }

    containsInviteLinks(content) {
        const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+/i;
        return inviteRegex.test(content);
    }

    /**
     * Handle invite links
     */
    async handleInviteLink(message, userProfile, settings) {
        if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return;
        }

        const userId = message.author.id;
        const guildId = message.guild.id;
        const inviteStrikes = userProfile.inviteStrikes || 0;

        try {
            await message.delete();
        } catch (error) {
            console.error("Failed to delete invite message:", error);
        }

        let action = "warn";
        let duration = null;

        if (inviteStrikes === 0) {
            action = "warn";
        } else if (inviteStrikes === 1) {
            action = "mute";
            duration = 5 * 60 * 1000;
        } else {
            action = "mute";
            duration = 30 * 60 * 1000;
        }

        const aiExplanation = await this.personality.generatePunishmentExplanation(
            action,
            "Posting Discord server invites",
            "medium",
            [],
            settings
        );

        const moderationCase = await this.database.createCase({
            guildId,
            userId,
            action,
            reason: "Discord server invite violation",
            aiExplanation,
            severity: 'medium',
            moderator: 'Barry (Auto)',
            automated: true,
            duration
        });

        if (action === "warn") {
            await this.sendWarning(message, aiExplanation, moderationCase.caseId, settings);
        } else if (action === "mute") {
            await this.executeMute(message, duration, aiExplanation, moderationCase.caseId, settings);
        }

        await this.database.updateUserData(userId, guildId, {
            inviteStrikes: inviteStrikes + 1
        });

        await this.sendToModLog(message.guild, {
            action,
            user: message.author,
            reason: "Discord server invite violation",
            moderator: 'Barry (Auto)',
            aiExplanation,
            caseId: moderationCase.caseId
        }, settings);
    }

    /**
     * Handle member join (raid detection)
     */
    async handleMemberJoin(member) {
        const settings = await this.database.getServerSettings(member.guild.id);
        if (!settings.features?.raidProtection) return;

        const now = Date.now();
        this.recentJoins.push(now);
        this.recentJoins = this.recentJoins.filter(time => now - time < 60000);

        if (this.recentJoins.length >= 5) {
            await this.handleRaid(member.guild);
        }

        const accountAge = now - member.user.createdTimestamp;
        if (accountAge < 7 * 24 * 60 * 60 * 1000) {
            await this.flagSuspiciousJoin(member);
        }

        // Initialize user in database
        await this.database.getUserData(member.id, member.guild.id);
    }

    async handleRaid(guild) {
        const modChannel = await this.getModChannel(guild);
        if (!modChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle("Potential Raid Detected")
            .setDescription("5+ users have joined within the last 60 seconds")
            .setTimestamp();

        await modChannel.send({ 
            content: '@here',
            embeds: [embed] 
        });
    }

    async flagSuspiciousJoin(member) {
        const modChannel = await this.getModChannel(member.guild);
        if (!modChannel) return;

        const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (24 * 60 * 60 * 1000));

        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle("Suspicious Account Join")
            .setDescription(`${member.user.tag} joined with a ${accountAge} day old account`)
            .addFields(
                { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setTimestamp();

        await modChannel.send({ embeds: [embed] });
    }

    /**
     * Send to mod log with full audit info
     * Also sends to configured mod channel and DMs subscribed mods
     */
    async sendToModLog(guild, logData, settings) {
        const embed = new EmbedBuilder()
            .setColor(this.getActionColor(logData.action))
            .setTitle(`${this.getActionEmoji(logData.action)} ${logData.action.toUpperCase()}`)
            .addFields(
                { name: 'User', value: `${logData.user.tag} (${logData.user.id})`, inline: true },
                { name: 'Moderator', value: logData.moderator, inline: true },
                { name: 'Case', value: `#${logData.caseId}`, inline: true },
                { name: 'Reason', value: logData.reason, inline: false }
            )
            .setTimestamp();

        if (logData.aiExplanation) {
            embed.addFields({ name: 'AI Explanation', value: logData.aiExplanation, inline: false });
        }

        if (logData.severity) {
            embed.addFields({ name: 'Severity', value: logData.severity, inline: true });
        }

        if (logData.severityScore) {
            embed.addFields({ name: 'Score', value: `${logData.severityScore}/100`, inline: true });
        }

        if (logData.duration) {
            embed.addFields({ name: 'Duration', value: this.formatDuration(logData.duration), inline: true });
        }

        // 1. Send to configured mod log channel (if set)
        if (settings?.modLogChannelId) {
            try {
                const configuredChannel = await guild.channels.fetch(settings.modLogChannelId);
                if (configuredChannel) {
                    await configuredChannel.send({ embeds: [embed] });
                }
            } catch (err) {
                console.error('Failed to send to configured mod channel:', err.message);
            }
        }

        // 2. Also send to default #barry-mods channel
        const modChannel = await this.getModChannel(guild);
        if (modChannel && modChannel.id !== settings?.modLogChannelId) {
            await modChannel.send({ embeds: [embed] });
        }

        // 3. Send DM to subscribed mods for important events
        const importantActions = ['warn', 'ban', 'mute', 'kick', 'escalate'];
        if (importantActions.includes(logData.action)) {
            await this.notifyModsByDm(guild, logData, settings);
        }
    }

    /**
     * Send DM notifications to subscribed mods
     */
    async notifyModsByDm(guild, logData, settings) {
        const subscribers = settings?.modDmSubscribers || [];
        if (subscribers.length === 0) return;

        const dmEmbed = new EmbedBuilder()
            .setColor(this.getActionColor(logData.action))
            .setTitle(`🚨 [${guild.name}] ${logData.action.toUpperCase()}`)
            .setDescription(`**User:** ${logData.user.tag}\n**Reason:** ${logData.reason}`)
            .addFields(
                { name: 'Case', value: `#${logData.caseId}`, inline: true },
                { name: 'Moderator', value: logData.moderator, inline: true }
            )
            .setFooter({ text: `Use /mod-dm off to disable these notifications` })
            .setTimestamp();

        for (const modId of subscribers) {
            try {
                const mod = await guild.client.users.fetch(modId);
                await mod.send({ embeds: [dmEmbed] });
            } catch (err) {
                // User has DMs disabled or left server - silently ignore
            }
        }
    }

    async getModChannel(guild) {
        let channel = guild.channels.cache.find(ch => ch.name === 'barry-mods' && ch.type === 0);

        if (!channel) {
            try {
                channel = await guild.channels.create({
                    name: 'barry-mods',
                    type: 0,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone,
                            deny: [PermissionsBitField.Flags.ViewChannel]
                        }
                    ]
                });
            } catch (error) {
                console.error("Failed to create mod channel:", error);
            }
        }

        return channel;
    }

    getActionColor(action) {
        const colors = {
            warn: 0xFFFF00,
            mute: 0xFF8C00,
            timeout: 0xFF8C00,
            unmute: 0x00FF00,
            ban: 0xFF0000,
            unban: 0x00FF00,
            kick: 0xFF4500,
            escalate: 0xFF0000,
            unwarn: 0x00FF00
        };
        return colors[action] || 0x0099FF;
    }

    getActionEmoji(action) {
        const emojis = {
            warn: '⚠️',
            mute: '🔇',
            timeout: '🔇',
            unmute: '🔊',
            ban: '🔨',
            unban: '✅',
            kick: '👢',
            escalate: '🚨',
            unwarn: '✅'
        };
        return emojis[action] || '📝';
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
    // MANUAL MODERATION COMMANDS (for commands.js)
    // ===========================================

    /**
     * Manual warn command
     */
    async manualWarn(guild, moderator, targetUser, reason, settings = null) {
        if (!settings) settings = await this.database.getServerSettings(guild.id);
        
        const userProfile = await this.database.getUserData(targetUser.id, guild.id);
        const recentWarnings = await this.database.getRecentWarnings(targetUser.id, guild.id, 24);

        const aiExplanation = await this.personality.generatePunishmentExplanation(
            'warn',
            reason,
            'medium',
            recentWarnings,
            settings
        );

        const moderationCase = await this.database.createCase({
            guildId: guild.id,
            userId: targetUser.id,
            action: 'warn',
            reason,
            aiExplanation,
            severity: 'medium',
            moderator: moderator.tag,
            moderatorId: moderator.id,
            automated: false
        });

        await this.database.addUserWarning(targetUser.id, guild.id, {
            reason,
            severity: 'medium',
            moderator: moderator.tag,
            aiExplanation,
            caseId: moderationCase.caseId
        });

        return { case: moderationCase, aiExplanation };
    }

    /**
     * Manual unwarn command
     */
    async manualUnwarn(guild, moderator, targetUser, caseId, reason) {
        await this.database.removeUserWarning(targetUser.id, guild.id, caseId);
        
        const unwarnCase = await this.database.createCase({
            guildId: guild.id,
            userId: targetUser.id,
            action: 'unwarn',
            reason: reason || `Removed warning case #${caseId}`,
            moderator: moderator.tag,
            moderatorId: moderator.id,
            automated: false,
            relatedCases: [caseId]
        });

        return unwarnCase;
    }

    /**
     * Manual mute command
     */
    async manualMute(guild, member, moderator, duration, reason, settings = null) {
        if (!settings) settings = await this.database.getServerSettings(guild.id);
        
        const userProfile = await this.database.getUserData(member.id, guild.id);
        const recentWarnings = await this.database.getRecentWarnings(member.id, guild.id, 24);

        const aiExplanation = await this.personality.generatePunishmentExplanation(
            'mute',
            reason,
            'medium',
            recentWarnings,
            settings
        );

        try {
            await member.timeout(duration, reason);
        } catch (error) {
            throw new Error(`Failed to mute user: ${error.message}`);
        }

        await this.database.muteUser(member.id, guild.id, duration);

        const moderationCase = await this.database.createCase({
            guildId: guild.id,
            userId: member.id,
            action: 'mute',
            reason,
            aiExplanation,
            severity: 'medium',
            moderator: moderator.tag,
            moderatorId: moderator.id,
            automated: false,
            duration,
            expiresAt: new Date(Date.now() + duration)
        });

        return { case: moderationCase, aiExplanation };
    }

    /**
     * Manual unmute command
     */
    async manualUnmute(guild, member, moderator, reason) {
        try {
            await member.timeout(null);
        } catch (error) {
            throw new Error(`Failed to unmute user: ${error.message}`);
        }

        await this.database.unmuteUser(member.id, guild.id);

        const moderationCase = await this.database.createCase({
            guildId: guild.id,
            userId: member.id,
            action: 'unmute',
            reason: reason || 'Unmuted by moderator',
            moderator: moderator.tag,
            moderatorId: moderator.id,
            automated: false
        });

        return moderationCase;
    }

    /**
     * Manual ban command
     */
    async manualBan(guild, targetUser, moderator, reason, settings = null) {
        if (!settings) settings = await this.database.getServerSettings(guild.id);

        const userProfile = await this.database.getUserData(targetUser.id, guild.id);

        const aiExplanation = await this.personality.generatePunishmentExplanation(
            'ban',
            reason,
            'high',
            userProfile.warnings || [],
            settings
        );

        try {
            await guild.members.ban(targetUser.id, { reason });
        } catch (error) {
            throw new Error(`Failed to ban user: ${error.message}`);
        }

        await this.database.banUser(targetUser.id, guild.id);

        const moderationCase = await this.database.createCase({
            guildId: guild.id,
            userId: targetUser.id,
            action: 'ban',
            reason,
            aiExplanation,
            severity: 'critical',
            severityScore: 100,
            moderator: moderator.tag,
            moderatorId: moderator.id,
            automated: false
        });

        return { case: moderationCase, aiExplanation };
    }

    /**
     * Manual unban command
     */
    async manualUnban(guild, userId, moderator, reason) {
        try {
            await guild.members.unban(userId, reason);
        } catch (error) {
            throw new Error(`Failed to unban user: ${error.message}`);
        }

        await this.database.unbanUser(userId, guild.id);

        const moderationCase = await this.database.createCase({
            guildId: guild.id,
            userId,
            action: 'unban',
            reason: reason || 'Unbanned by moderator',
            moderator: moderator.tag,
            moderatorId: moderator.id,
            automated: false
        });

        return moderationCase;
    }
}

module.exports = ModerationHandler;
