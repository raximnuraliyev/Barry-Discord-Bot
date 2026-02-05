
const mongoose = require('mongoose');
const axios = require('axios');
const connectMongo = require('./mongo');
const { 
    User, ModerationLog, Note, ServerState, 
    OffensiveWord, ServerSettings, ModerationCase, 
    Appeal, AuditLog, UserMemory, BarryMemory,
    ServerRule, AutoResponse, ScheduledAnnouncement,
    GameScore, DailyScore, ReputationLog,
    GameSession, GameResult, Achievement, UserAchievement,
    LeaderboardEntry, UserGameStats, DailyChallenge, ActiveUser
} = require('./models');

// Bad words list URL
const BAD_WORDS_URL = 'https://www.cs.cmu.edu/~biglou/resources/bad-words.txt';

/**
 * DatabaseHandler - Manages all 3 layers of Barry's architecture
 * Layer 1: Rules (OffensiveWord, ServerSettings)
 * Layer 2: AI Context (User profiles, behavioral data)
 * Layer 3: Memory (Cases, logs, appeals, audit trail)
 * 
 * ALL DATA IS PER-SERVER (guildId-specific)
 */
class DatabaseHandler {
    constructor() {
        this.caseCounter = new Map(); // Guild -> case count cache
        this.badWordsCache = null; // Cache for URL-fetched words
    }

    // ===========================================
    // LAYER 1: RULES - Admin-controlled, deterministic
    // ===========================================

    /**
     * Fetch bad words list from URL (cached)
     */
    async fetchBadWordsList() {
        if (this.badWordsCache) return this.badWordsCache;
        
        try {
            const response = await axios.get(BAD_WORDS_URL, { 
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const text = response.data;
            
            // Check if we got HTML instead of text (some URLs redirect)
            if (typeof text === 'string' && text.includes('<!DOCTYPE') || text.includes('<html')) {
                console.error('Bad words URL returned HTML, using fallback');
                throw new Error('HTML response instead of text');
            }
            
            const words = text.split('\n')
                .map(w => w.trim().toLowerCase())
                .filter(w => w.length > 0 && !w.startsWith('#') && w.length < 30);
            
            this.badWordsCache = words;
            console.log(`Loaded ${words.length} bad words from URL`);
            return words;
        } catch (error) {
            console.error('Error fetching bad words list:', error.message);
            // Return expanded fallback list with ~200 words
            this.badWordsCache = [
                // High severity slurs (censored/abbreviated for safety)
                'fuck', 'fucking', 'fucked', 'fucker', 'motherfucker', 'motherfucking',
                'shit', 'shitty', 'bullshit', 'shitting', 'shithead', 'dipshit',
                'bitch', 'bitchy', 'bitches', 'bitching', 'sonofabitch',
                'ass', 'asshole', 'asses', 'dumbass', 'fatass', 'jackass', 'smartass',
                'dick', 'dickhead', 'dicks',
                'cock', 'cocks', 'cocksucker',
                'pussy', 'pussies',
                'damn', 'goddamn', 'damnit',
                'crap', 'crappy',
                'hell', 'hellish',
                'bastard', 'bastards',
                'piss', 'pissed', 'pissing',
                'cunt', 'cunts',
                'whore', 'whores', 'whorish',
                'slut', 'sluts', 'slutty',
                'retard', 'retarded', 'retards',
                'idiot', 'idiots', 'idiotic',
                'moron', 'morons', 'moronic',
                'dumb', 'dumbass',
                'stupid', 'stupidity',
                'loser', 'losers',
                'jerk', 'jerks',
                'douche', 'douchebag', 'douches',
                'twat', 'twats',
                'wanker', 'wankers',
                'prick', 'pricks',
                'arse', 'arsehole',
                'bollocks',
                'bugger',
                'bloody',
                'sod',
                'tit', 'tits', 'titty',
                'boob', 'boobs', 'booby',
                'penis', 'penises',
                'vagina', 'vaginas',
                'sex', 'sexy', 'sexual', 'sexually',
                'porn', 'porno', 'pornography',
                'nude', 'nudes', 'nudity',
                'naked',
                'horny',
                'orgasm',
                'masturbate', 'masturbation',
                'erection',
                'ejaculate', 'ejaculation',
                'cum', 'cumming', 'cumshot',
                'dildo', 'dildos',
                'vibrator',
                'blowjob', 'blowjobs',
                'handjob',
                'anal',
                'oral',
                'genital', 'genitals',
                'scrotum',
                'testicle', 'testicles',
                'breast', 'breasts',
                'nipple', 'nipples',
                'areola',
                'clitoris',
                'labia',
                'hymen',
                'phallus',
                'vulva',
                'sperm',
                'semen',
                'ovary', 'ovaries',
                'uterus',
                'fetus', 'foetus',
                'abortion',
                'rape', 'raped', 'rapist', 'raping',
                'molest', 'molested', 'molester', 'molesting',
                'pedophile', 'paedophile', 'pedo', 'paedo',
                'incest',
                'necrophilia',
                'bestiality',
                'zoophilia',
                'drug', 'drugs',
                'cocaine', 'coke',
                'heroin',
                'meth', 'methamphetamine',
                'marijuana', 'weed', 'pot', 'cannabis',
                'lsd', 'acid',
                'ecstasy', 'mdma', 'molly',
                'ketamine',
                'crack',
                'overdose',
                'suicide', 'suicidal',
                'kill', 'killing', 'killer',
                'murder', 'murdered', 'murderer',
                'die', 'dying', 'death',
                'bomb', 'bombing',
                'terror', 'terrorist', 'terrorism',
                'hate', 'hating', 'hatred', 'hater',
                'racist', 'racism',
                'sexist', 'sexism',
                'homophobe', 'homophobic', 'homophobia',
                'nazi', 'nazis',
                'fascist', 'fascism',
                'genocide',
                'holocaust',
                'slavery', 'slave',
                'torture', 'tortured'
            ];
            console.log(`Using fallback list of ${this.badWordsCache.length} bad words`);
            return this.badWordsCache;
        }
    }

    /**
     * Get all offensive words for a guild (guildId-specific)
     */
    async getOffensiveWords(guildId) {
        return OffensiveWord.find({ guildId, enabled: true });
    }

    /**
     * Add an offensive word (guildId-specific)
     */
    async addOffensiveWord(guildId, word, options = {}) {
        const { matchType = 'partial', severity = 'medium', defaultAction = 'warn', addedBy } = options;
        try {
            await OffensiveWord.updateOne(
                { guildId, word: word.toLowerCase() },
                { 
                    $set: { 
                        matchType, 
                        severity, 
                        defaultAction, 
                        addedBy, 
                        enabled: true,
                        addedAt: new Date()
                    } 
                },
                { upsert: true }
            );
            return { success: true };
        } catch (error) {
            console.error('Failed to add offensive word:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove an offensive word (guildId-specific)
     */
    async removeOffensiveWord(guildId, word) {
        const result = await OffensiveWord.deleteOne({ guildId, word: word.toLowerCase() });
        return result.deletedCount > 0;
    }

    /**
     * Check if server has been seeded with default words
     */
    async hasDefaultWords(guildId) {
        const count = await OffensiveWord.countDocuments({ guildId });
        return count > 0;
    }

    /**
     * Get server settings (with defaults) - guildId-specific
     */
    async getServerSettings(guildId) {
        let settings = await ServerSettings.findOne({ guildId });
        if (!settings) {
            settings = await ServerSettings.create({ 
                guildId,
                moderationMode: 'hybrid',
                personalitySettings: {
                    humorLevel: 5,
                    strictnessLevel: 5,
                    verbosityLevel: 5,
                    responseChance: 80
                },
                features: {
                    appealSystem: true,
                    autoModeration: true,
                    aiExplanations: true
                }
            });
        }
        return settings;
    }

    /**
     * Update server settings
     */
    async updateServerSettings(guildId, updates) {
        return ServerSettings.findOneAndUpdate(
            { guildId },
            { $set: updates },
            { upsert: true, new: true }
        );
    }

    /**
     * Update punishment thresholds
     */
    async updatePunishmentThresholds(guildId, thresholds) {
        return this.updateServerSettings(guildId, { punishmentThresholds: thresholds });
    }

    /**
     * Update personality settings
     */
    async updatePersonalitySettings(guildId, personality) {
        return this.updateServerSettings(guildId, { personalitySettings: personality });
    }

    /**
     * Set moderation mode (silent/strict/hybrid)
     */
    async setModerationMode(guildId, mode) {
        return this.updateServerSettings(guildId, { moderationMode: mode });
    }

    // ===========================================
    // LAYER 2: AI CONTEXT - User profiles, behavior
    // ===========================================

    /**
     * Get user data with defaults
     */
    async getUserData(userId, guildId) {
        let user = await User.findOne({ userId, guildId });
        if (!user) {
            user = await User.create({ 
                userId, 
                guildId, 
                lastActivity: Date.now(),
                joinedAt: new Date()
            });
        }
        return user;
    }

    /**
     * Update user data
     */
    async updateUserData(userId, guildId, updateData) {
        await User.updateOne(
            { userId, guildId },
            { $set: updateData },
            { upsert: true }
        );
    }

    /**
     * Update user activity
     */
    async updateUserActivity(userId, guildId) {
        await this.updateUserData(userId, guildId, { lastActivity: Date.now() });
    }

    /**
     * Update user strikes
     */
    async updateUserStrikes(userId, guildId, strikes) {
        await this.updateUserData(userId, guildId, { strikes });
    }

    /**
     * Add a warning to user's record
     */
    async addUserWarning(userId, guildId, warning) {
        await User.updateOne(
            { userId, guildId },
            { 
                $push: { warnings: warning },
                $inc: { strikes: 1 }
            },
            { upsert: true }
        );
    }

    /**
     * Remove a warning (unwarn)
     */
    async removeUserWarning(userId, guildId, caseId) {
        // Remove from user's warnings array
        await User.updateOne(
            { userId, guildId },
            { 
                $pull: { warnings: { caseId } },
                $inc: { strikes: -1 }
            }
        );
        
        // Mark the original case as resolved
        await ModerationCase.updateOne(
            { guildId, caseId },
            { 
                $set: { 
                    resolved: true, 
                    resolvedAt: new Date() 
                } 
            }
        );
    }

    /**
     * Update user trust level based on behavior
     */
    async updateTrustLevel(userId, guildId, delta) {
        const user = await this.getUserData(userId, guildId);
        const newTrust = Math.max(-10, Math.min(10, (user.trustLevel || 0) + delta));
        await this.updateUserData(userId, guildId, { trustLevel: newTrust });
        return newTrust;
    }

    /**
     * Update user behavior profile
     */
    async updateBehaviorProfile(userId, guildId, behaviorUpdate) {
        await User.updateOne(
            { userId, guildId },
            { $set: { 'behaviorProfile': behaviorUpdate } },
            { upsert: true }
        );
    }

    /**
     * Record user interaction (for AI context)
     */
    async recordInteraction(userId, guildId, isPositive = true) {
        const update = {
            $inc: {
                'behaviorProfile.interactionCount': 1,
                [`behaviorProfile.${isPositive ? 'positiveInteractions' : 'negativeInteractions'}`]: 1
            }
        };
        await User.updateOne({ userId, guildId }, update, { upsert: true });
    }

    /**
     * Get user memory for AI context
     */
    async getUserMemory(userId, guildId) {
        let memory = await UserMemory.findOne({ userId, guildId });
        if (!memory) {
            memory = await UserMemory.create({ userId, guildId });
        }
        return memory;
    }

    /**
     * Update user memory
     */
    async updateUserMemory(userId, guildId, updates) {
        return UserMemory.findOneAndUpdate(
            { userId, guildId },
            { $set: { ...updates, lastInteraction: new Date() } },
            { upsert: true, new: true }
        );
    }

    /**
     * Get recent warnings within time period (for progressive punishment)
     */
    async getRecentWarnings(userId, guildId, hoursAgo = 24) {
        const user = await this.getUserData(userId, guildId);
        const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
        return (user.warnings || []).filter(w => new Date(w.timestamp) > cutoff);
    }

    /**
     * Calculate severity trend for progressive punishment
     */
    async getSeverityTrend(userId, guildId) {
        const recentWarnings = await this.getRecentWarnings(userId, guildId, 24);
        const severityScores = { low: 1, medium: 2, high: 3 };
        if (recentWarnings.length === 0) return { count: 0, avgSeverity: 0, trend: 'none' };
        
        const totalScore = recentWarnings.reduce((sum, w) => sum + (severityScores[w.severity] || 1), 0);
        const avgSeverity = totalScore / recentWarnings.length;
        
        return {
            count: recentWarnings.length,
            avgSeverity,
            trend: avgSeverity > 2 ? 'escalating' : avgSeverity > 1.5 ? 'moderate' : 'stable'
        };
    }

    // ===========================================
    // LAYER 3: MEMORY - Cases, logs, appeals
    // ===========================================

    /**
     * Generate unique case ID
     */
    async generateCaseId(guildId) {
        const count = await ModerationCase.countDocuments({ guildId });
        return `${count + 1}`;
    }

    /**
     * Create a moderation case
     */
    async createCase(caseData) {
        const caseId = caseData.caseId || await this.generateCaseId(caseData.guildId);
        const fullCaseData = {
            ...caseData,
            caseId,
            timestamp: new Date()
        };
        
        const moderationCase = await ModerationCase.create(fullCaseData);
        
        // Also log to legacy log for compatibility
        await this.logAction({
            userId: caseData.userId,
            guildId: caseData.guildId,
            action: caseData.action,
            reason: caseData.reason,
            moderator: caseData.moderator,
            duration: caseData.duration,
            automated: caseData.automated,
            caseId
        });

        // Add to audit log
        await this.addAuditLog({
            guildId: caseData.guildId,
            actionType: caseData.action,
            targetId: caseData.userId,
            targetType: 'user',
            performedBy: caseData.moderator,
            performedById: caseData.moderatorId,
            caseId,
            aiExplanation: caseData.aiExplanation,
            severityScore: caseData.severityScore,
            details: caseData
        });

        return moderationCase;
    }

    /**
     * Get a case by ID
     */
    async getCase(guildId, caseId) {
        return ModerationCase.findOne({ guildId, caseId });
    }

    /**
     * Get recent cases for a guild
     */
    async getRecentCases(guildId, limit = 20) {
        return ModerationCase.find({ guildId })
            .sort({ timestamp: -1 })
            .limit(limit);
    }

    /**
     * Get all cases for a user
     */
    async getUserCases(userId, guildId) {
        return ModerationCase.find({ userId, guildId }).sort({ timestamp: -1 });
    }

    /**
     * Update case (e.g., for appeals)
     */
    async updateCase(guildId, caseId, updates) {
        return ModerationCase.findOneAndUpdate(
            { guildId, caseId },
            { $set: updates },
            { new: true }
        );
    }

    /**
     * Log action (legacy compatibility)
     */
    async logAction(actionData) {
        await ModerationLog.create({
            ...actionData,
            timestamp: new Date()
        });
    }

    /**
     * Get user actions
     */
    async getUserActions(userId, guildId) {
        return ModerationLog.find({ userId, guildId }).sort({ timestamp: -1 });
    }

    /**
     * Add a note
     */
    async addNote(userId, guildId, note, moderator, moderatorId) {
        await Note.create({
            userId,
            guildId,
            note,
            moderator,
            moderatorId,
            timestamp: new Date()
        });
    }

    /**
     * Get user notes
     */
    async getUserNotes(userId, guildId) {
        return Note.find({ userId, guildId }).sort({ timestamp: -1 });
    }

    /**
     * Create an appeal
     */
    async createAppeal(appealData) {
        const appealId = `appeal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return Appeal.create({
            ...appealData,
            appealId,
            createdAt: new Date()
        });
    }

    /**
     * Get pending appeals for a guild
     */
    async getPendingAppeals(guildId) {
        return Appeal.find({ guildId, status: 'pending' }).sort({ createdAt: 1 });
    }

    /**
     * Get appeal by ID
     */
    async getAppeal(appealId) {
        return Appeal.findOne({ appealId });
    }

    /**
     * Update appeal status
     */
    async updateAppeal(appealId, updates) {
        return Appeal.findOneAndUpdate(
            { appealId },
            { $set: updates },
            { new: true }
        );
    }

    /**
     * Add to audit log
     */
    async addAuditLog(logData) {
        return AuditLog.create({
            ...logData,
            timestamp: new Date()
        });
    }

    /**
     * Get audit log for a guild
     */
    async getAuditLog(guildId, limit = 50) {
        return AuditLog.find({ guildId })
            .sort({ timestamp: -1 })
            .limit(limit);
    }

    /**
     * Get server stats
     */
    async getServerStats(guildId) {
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        
        const [totalUsers, todayActions, weekActions, pendingAppeals] = await Promise.all([
            User.countDocuments({ guildId }),
            ModerationCase.countDocuments({ guildId, timestamp: { $gt: new Date(dayAgo) } }),
            ModerationCase.find({ guildId, timestamp: { $gt: new Date(weekAgo) } }),
            Appeal.countDocuments({ guildId, status: 'pending' })
        ]);
        
        const bansThisWeek = weekActions.filter(a => a.action === 'ban').length;
        const mutesThisWeek = weekActions.filter(a => a.action === 'mute' || a.action === 'timeout').length;
        const warningsThisWeek = weekActions.filter(a => a.action === 'warn').length;
        
        return {
            totalUsers,
            actionsToday: todayActions,
            actionsThisWeek: weekActions.length,
            bansThisWeek,
            mutesThisWeek,
            warningsThisWeek,
            pendingAppeals
        };
    }

    /**
     * Mute user in database
     */
    async muteUser(userId, guildId, duration, reason, moderator, moderatorId) {
        const expiresAt = duration ? new Date(Date.now() + duration) : null;
        await this.updateUserData(userId, guildId, {
            muted: true,
            mutedUntil: expiresAt
        });
    }

    /**
     * Unmute user in database
     */
    async unmuteUser(userId, guildId) {
        await this.updateUserData(userId, guildId, {
            muted: false,
            mutedUntil: null
        });
    }

    /**
     * Ban user in database
     */
    async banUser(userId, guildId) {
        await this.updateUserData(userId, guildId, { banned: true });
    }

    /**
     * Unban user in database
     */
    async unbanUser(userId, guildId) {
        await this.updateUserData(userId, guildId, { banned: false });
    }

    /**
     * Opt out of check-ins
     */
    async optOutCheckins(userId, guildId) {
        await this.updateUserData(userId, guildId, { optedOutCheckins: true });
    }

    /**
     * Get Barry memory
     */
    async getBarryMemory(guildId, memoryType) {
        return BarryMemory.findOne({ guildId, memoryType });
    }

    /**
     * Update Barry memory
     */
    async updateBarryMemory(guildId, memoryType, data) {
        return BarryMemory.findOneAndUpdate(
            { guildId, memoryType },
            { $set: { data, timestamp: new Date() } },
            { upsert: true, new: true }
        );
    }

    /**
     * Seed default offensive words for a guild from URL
     * Each server gets their own copy of the word list
     */
    async seedDefaultOffensiveWords(guildId) {
        // Check if already seeded
        if (await this.hasDefaultWords(guildId)) {
            console.log(`Server ${guildId} already has words configured`);
            return;
        }

        // High severity words (hardcoded for safety)
        const highSeverityWords = [
            { word: 'nigger', severity: 'high', defaultAction: 'mute' },
            { word: 'nigga', severity: 'high', defaultAction: 'mute' },
            { word: 'faggot', severity: 'high', defaultAction: 'mute' },
            { word: 'kys', severity: 'high', defaultAction: 'escalate' },
            { word: 'kill yourself', severity: 'high', defaultAction: 'escalate', matchType: 'exact' },
        ];

        // Fetch words from URL
        const urlWords = await this.fetchBadWordsList();
        
        // Categorize URL words by common patterns
        const mediumSeverityPatterns = ['fuck', 'shit', 'bitch', 'ass', 'dick', 'cock', 'pussy', 'cunt', 'whore', 'slut', 'retard'];
        
        const processedWords = new Set();

        // Add high severity words first
        for (const word of highSeverityWords) {
            if (!processedWords.has(word.word)) {
                await this.addOffensiveWord(guildId, word.word, {
                    matchType: word.matchType || 'partial',
                    severity: word.severity,
                    defaultAction: word.defaultAction,
                    addedBy: 'Barry (Default)'
                });
                processedWords.add(word.word);
            }
        }

        // Process URL words
        for (const word of urlWords) {
            if (processedWords.has(word) || word.length < 2) continue;
            
            // Determine severity based on patterns
            let severity = 'low';
            let defaultAction = 'delete';
            
            if (mediumSeverityPatterns.some(p => word.includes(p))) {
                severity = 'medium';
                defaultAction = 'warn';
            }
            
            // Check if it's a slur (likely high severity)
            if (highSeverityWords.some(h => word.includes(h.word))) {
                severity = 'high';
                defaultAction = 'mute';
            }

            await this.addOffensiveWord(guildId, word, {
                matchType: 'partial',
                severity,
                defaultAction,
                addedBy: 'Barry (URL Import)'
            });
            processedWords.add(word);
        }

        console.log(`Seeded ${processedWords.size} words for server ${guildId}`);
    }

    // ===========================================
    // NEW FEATURES: Rules, Auto-Responses, Games
    // ===========================================

    /**
     * Server Rules Management
     */
    async setServerRule(guildId, number, text) {
        return ServerRule.findOneAndUpdate(
            { guildId, number },
            { $set: { text, addedAt: new Date() } },
            { upsert: true, new: true }
        );
    }

    async deleteServerRule(guildId, number) {
        return ServerRule.deleteOne({ guildId, number });
    }

    async getServerRules(guildId) {
        return ServerRule.find({ guildId }).sort({ number: 1 });
    }

    /**
     * Auto-Response Management
     */
    async addAutoResponse(guildId, trigger, response, useAI = false, addedBy = null) {
        return AutoResponse.findOneAndUpdate(
            { guildId, trigger: trigger.toLowerCase() },
            { $set: { response, useAI, addedBy, addedAt: new Date() } },
            { upsert: true, new: true }
        );
    }

    async removeAutoResponse(guildId, trigger) {
        return AutoResponse.deleteOne({ guildId, trigger: trigger.toLowerCase() });
    }

    async getAutoResponses(guildId) {
        return AutoResponse.find({ guildId });
    }

    async getAutoResponse(guildId, trigger) {
        return AutoResponse.findOne({ guildId, trigger: trigger.toLowerCase() });
    }

    /**
     * Scheduled Announcements
     */
    async addScheduledAnnouncement(guildId, channelId, message, sendAt, repeat, createdBy) {
        return ScheduledAnnouncement.create({
            guildId, channelId, message, sendAt, repeat, createdBy
        });
    }

    async getDueAnnouncements() {
        const now = Date.now();
        return ScheduledAnnouncement.find({ sendAt: { $lte: now }, delivered: false });
    }

    async markAnnouncementDelivered(id, repeat) {
        if (repeat) {
            // Reschedule for next occurrence
            return ScheduledAnnouncement.findByIdAndUpdate(id, { 
                $set: { sendAt: Date.now() + repeat } 
            });
        } else {
            return ScheduledAnnouncement.findByIdAndUpdate(id, { 
                $set: { delivered: true } 
            });
        }
    }

    /**
     * Shadow Mode
     */
    async setShadowMode(guildId, enabled) {
        return this.updateServerSettings(guildId, { 'features.shadowMode': enabled });
    }

    async isShadowMode(guildId) {
        const settings = await this.getServerSettings(guildId);
        return settings?.features?.shadowMode || false;
    }

    /**
     * Game Scores
     */
    async saveGameScore(guildId, userId, gameType, score) {
        return GameScore.create({ guildId, userId, gameType, score });
    }

    async addGameWin(guildId, userId) {
        return User.updateOne(
            { userId, guildId },
            { $inc: { 'gameStats.wins': 1 } },
            { upsert: true }
        );
    }

    async getGameLeaderboard(guildId, limit = 10) {
        // Get users with most wins
        const users = await User.find({ guildId, 'gameStats.wins': { $gt: 0 } })
            .sort({ 'gameStats.wins': -1 })
            .limit(limit);
        return users.map(u => ({ userId: u.userId, wins: u.gameStats?.wins || 0 }));
    }

    /**
     * Daily Challenge
     */
    async saveDailyScore(guildId, userId, date, score) {
        return DailyScore.create({ guildId, userId, date, score });
    }

    async hasPlayedDaily(guildId, userId, date) {
        const existing = await DailyScore.findOne({ guildId, userId, date });
        return !!existing;
    }

    async getDailyLeaderboard(guildId, date, limit = 10) {
        return DailyScore.find({ guildId, date })
            .sort({ score: 1 }) // Lower score = faster reaction = better
            .limit(limit);
    }

    /**
     * Reputation System
     */
    async giveReputation(guildId, fromUserId, toUserId) {
        // Log the reputation give
        await ReputationLog.create({ guildId, fromUserId, toUserId });
        // Increment target's reputation
        return User.updateOne(
            { userId: toUserId, guildId },
            { $inc: { reputation: 1 } },
            { upsert: true }
        );
    }

    async canGiveRep(guildId, fromUserId, toUserId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existing = await ReputationLog.findOne({
            guildId,
            fromUserId,
            toUserId,
            timestamp: { $gte: today }
        });
        return !existing;
    }

    async getReputationLeaderboard(guildId, limit = 10) {
        return User.find({ guildId, reputation: { $gt: 0 } })
            .sort({ reputation: -1 })
            .limit(limit)
            .select('userId reputation');
    }

    /**
     * Health Dashboard Stats
     */
    async getHealthStats(guildId) {
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

        // Get actions from last week
        const weekActions = await ModerationCase.find({ 
            guildId, 
            timestamp: { $gt: new Date(weekAgo) } 
        });

        // Calculate warns per day average
        const warnsPerDay = weekActions.filter(a => a.action === 'warn').length / 7;

        // Calculate toxicity trend
        const firstHalf = weekActions.filter(a => new Date(a.timestamp) < new Date(now - 3.5 * 24 * 60 * 60 * 1000)).length;
        const secondHalf = weekActions.filter(a => new Date(a.timestamp) >= new Date(now - 3.5 * 24 * 60 * 60 * 1000)).length;
        
        let toxicityTrend = 'stable';
        if (secondHalf > firstHalf * 1.5) toxicityTrend = 'increasing';
        else if (secondHalf < firstHalf * 0.5) toxicityTrend = 'decreasing';

        // Get pending appeals
        const pendingAppeals = await Appeal.countDocuments({ guildId, status: 'pending' });

        // Get active mods (who have taken action in last week)
        const activeMods = await ModerationCase.distinct('moderatorId', {
            guildId,
            timestamp: { $gt: new Date(weekAgo) },
            automated: false
        });

        return {
            warnsPerDay,
            toxicityTrend,
            activeMods: activeMods.length,
            mutesThisWeek: weekActions.filter(a => a.action === 'mute').length,
            bansThisWeek: weekActions.filter(a => a.action === 'ban').length,
            pendingAppeals
        };
    }

    // Alias methods for compatibility
    async createModerationCase(data) {
        return this.createCase(data);
    }

    async getCaseById(caseId) {
        return ModerationCase.findOne({ caseId });
    }

    async removeWarning(userId, guildId, caseId, moderator) {
        await this.removeUserWarning(userId, guildId, caseId);
        await this.createCase({
            guildId,
            userId,
            action: 'unwarn',
            reason: `Removed warning ${caseId}`,
            moderator
        });
    }

    async reviewAppeal(appealId, decision, reviewedBy, reviewedById, note) {
        const appeal = await Appeal.findOneAndUpdate(
            { appealId },
            { 
                $set: { 
                    status: decision, 
                    reviewedBy, 
                    reviewedById, 
                    reviewNote: note,
                    reviewedAt: new Date() 
                } 
            },
            { new: true }
        );
        
        if (appeal && decision === 'approved') {
            // Update the original case
            await this.updateCase(appeal.guildId, appeal.caseId, { appealStatus: 'approved' });
        }
        
        return appeal;
    }

    // ===========================================
    // ACTIVE USERS - Immune to auto-moderation
    // ===========================================

    async addActiveUser(guildId, userId, username, addedBy, addedById, reason) {
        return ActiveUser.findOneAndUpdate(
            { guildId, userId },
            { $set: { username, addedBy, addedById, reason, addedAt: new Date() } },
            { upsert: true, new: true }
        );
    }

    async removeActiveUser(guildId, userId) {
        return ActiveUser.deleteOne({ guildId, userId });
    }

    async isActiveUser(guildId, userId) {
        const user = await ActiveUser.findOne({ guildId, userId });
        return !!user;
    }

    async getActiveUsers(guildId) {
        return ActiveUser.find({ guildId }).sort({ addedAt: -1 });
    }

    // ===========================================
    // MODERATION LISTS - Warns, Bans, Mutes
    // ===========================================

    async getWarnList(guildId, limit = 50) {
        return ModerationCase.find({ 
            guildId, 
            action: 'warn',
            resolved: { $ne: true } // Exclude resolved/unwarned cases
        })
        .sort({ timestamp: -1 })
        .limit(limit);
    }

    async getBanList(guildId, limit = 50) {
        return ModerationCase.find({ 
            guildId, 
            action: 'ban' 
        })
        .sort({ timestamp: -1 })
        .limit(limit);
    }

    async getMuteList(guildId, limit = 50) {
        return ModerationCase.find({ 
            guildId, 
            action: { $in: ['mute', 'timeout'] }
        })
        .sort({ timestamp: -1 })
        .limit(limit);
    }

    async getActiveMutes(guildId) {
        return User.find({ 
            guildId, 
            muted: true,
            $or: [
                { mutedUntil: { $gt: new Date() } },
                { mutedUntil: null }
            ]
        });
    }

    async getActiveBans(guildId) {
        return User.find({ guildId, banned: true });
    }

    // ===========================================
    // MOD NOTIFICATIONS
    // ===========================================

    /**
     * Toggle mod DM notifications for a user
     */
    async toggleModDm(guildId, modId, enable) {
        if (enable) {
            return ServerSettings.findOneAndUpdate(
                { guildId },
                { $addToSet: { modDmSubscribers: modId } },
                { upsert: true, new: true }
            );
        } else {
            return ServerSettings.findOneAndUpdate(
                { guildId },
                { $pull: { modDmSubscribers: modId } },
                { upsert: true, new: true }
            );
        }
    }

    /**
     * Get all mods subscribed to DM notifications
     */
    async getModDmSubscribers(guildId) {
        const settings = await this.getServerSettings(guildId);
        return settings.modDmSubscribers || [];
    }

    /**
     * Set the mod log channel
     */
    async setModLogChannel(guildId, channelId) {
        return this.updateServerSettings(guildId, { modLogChannelId: channelId });
    }

    /**
     * Get the mod log channel
     */
    async getModLogChannel(guildId) {
        const settings = await this.getServerSettings(guildId);
        return settings.modLogChannelId;
    }
}

module.exports = DatabaseHandler;