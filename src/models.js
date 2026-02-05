const mongoose = require('mongoose');

// ===========================================
// LAYER 1: RULES - Admin-controlled, deterministic
// ===========================================

// Offensive words stored in DB (not code)
const offensiveWordSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    word: { type: String, required: true },
    matchType: { 
        type: String, 
        enum: ['exact', 'partial', 'regex'], 
        default: 'partial' 
    },
    severity: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'medium' 
    },
    defaultAction: { 
        type: String, 
        enum: ['warn', 'mute', 'delete', 'escalate'], 
        default: 'warn' 
    },
    addedBy: { type: String },
    addedAt: { type: Date, default: Date.now },
    enabled: { type: Boolean, default: true }
});
offensiveWordSchema.index({ guildId: 1, word: 1 }, { unique: true });

// Server settings for admin control
const serverSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    // Moderation mode
    moderationMode: { 
        type: String, 
        enum: ['silent', 'strict', 'hybrid'], 
        default: 'hybrid' 
    },
    // Punishment thresholds (admin configurable)
    punishmentThresholds: {
        lowWarnsForMute: { type: Number, default: 3 },
        mediumWarnsForMute: { type: Number, default: 2 },
        highWarnsForMute: { type: Number, default: 1 },
        muteDurationMinutes: { type: [Number], default: [5, 15, 30, 60, 120, 360, 720, 1440] },
        warnsDecayDays: { type: Number, default: 30 }
    },
    // AI Personality tuning (admin configurable)
    personalitySettings: {
        humorLevel: { type: Number, min: 0, max: 10, default: 5 },
        strictnessLevel: { type: Number, min: 0, max: 10, default: 5 },
        verbosityLevel: { type: Number, min: 0, max: 10, default: 5 },
        responseChance: { type: Number, min: 0, max: 100, default: 100 }
    },
    // Feature toggles
    features: {
        autoModeration: { type: Boolean, default: true },
        aiResponses: { type: Boolean, default: true },
        appealSystem: { type: Boolean, default: true },
        raidProtection: { type: Boolean, default: true },
        spamDetection: { type: Boolean, default: true }
    },
    modRoleIds: [{ type: String }],
    logChannelId: { type: String },
    appealChannelId: { type: String },
    // Mod notifications
    modLogChannelId: { type: String }, // Channel for all mod logs (#barry-mods)
    modDmSubscribers: [{ type: String }] // Array of mod user IDs who want DM notifications
});

// ===========================================
// LAYER 2: AI REASONING - Contextual, adaptive
// ===========================================

// User profile for context-aware responses
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    username: { type: String },
    // Moderation tracking
    strikes: { type: Number, default: 0 },
    warnings: [{
        reason: String,
        severity: String,
        moderator: String,
        timestamp: { type: Date, default: Date.now },
        aiExplanation: String,
        caseId: String
    }],
    lastActivity: { type: Number },
    lastMessage: { type: String },
    lastMessageTime: { type: Number },
    // Strike types
    inviteStrikes: { type: Number, default: 0 },
    spamStrikes: { type: Number, default: 0 },
    // Trust and behavior tracking (for context-aware moderation)
    trustLevel: { type: Number, default: 0, min: -10, max: 10 },
    reputation: { type: Number, default: 0 },
    // Behavioral patterns (for AI context)
    behaviorProfile: {
        communicationStyle: { type: String, enum: ['formal', 'casual', 'humorous', 'unknown'], default: 'unknown' },
        activityPattern: { type: String, enum: ['active', 'moderate', 'lurker', 'unknown'], default: 'unknown' },
        lastToneDetected: { type: String, enum: ['neutral', 'joking', 'angry', 'sad', 'sarcastic', 'unknown'], default: 'unknown' },
        interactionCount: { type: Number, default: 0 },
        positiveInteractions: { type: Number, default: 0 },
        negativeInteractions: { type: Number, default: 0 }
    },
    // Moderation state
    muted: { type: Boolean, default: false },
    mutedUntil: { type: Date },
    banned: { type: Boolean, default: false },
    restricted: { type: Boolean, default: false },
    // Check-in opt out
    optedOutCheckins: { type: Boolean, default: false },
    joinedAt: { type: Date },
    // Game stats
    gameStats: {
        wins: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        bestReactionTime: { type: Number }
    }
}, { timestamps: true });
userSchema.index({ guildId: 1, trustLevel: -1 });

// ===========================================
// LAYER 3: MEMORY - MongoDB persistent storage
// ===========================================

// Moderation case system
const moderationCaseSchema = new mongoose.Schema({
    caseId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    action: { 
        type: String, 
        required: true,
        enum: ['warn', 'unwarn', 'mute', 'unmute', 'kick', 'ban', 'unban', 'timeout', 'note', 'escalate', 'delete']
    },
    reason: { type: String },
    // AI-generated explanation in Barry's tone
    aiExplanation: { type: String },
    // Context for the case
    messageContent: { type: String },
    messageId: { type: String },
    channelId: { type: String },
    // Severity assessment
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    severityScore: { type: Number, min: 0, max: 100 },
    // Who handled it
    moderator: { type: String },
    moderatorId: { type: String },
    automated: { type: Boolean, default: false },
    // Duration for timeouts/mutes
    duration: { type: Number },
    expiresAt: { type: Date },
    // Appeal tracking
    appealStatus: { type: String, enum: ['none', 'pending', 'approved', 'denied'], default: 'none' },
    appealReason: { type: String },
    appealReviewedBy: { type: String },
    appealReviewedAt: { type: Date },
    // Resolved/Removed tracking (for unwarn)
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
    // Timestamps
    timestamp: { type: Date, default: Date.now },
    // Related cases
    relatedCases: [{ type: String }]
});
moderationCaseSchema.index({ guildId: 1, timestamp: -1 });
moderationCaseSchema.index({ guildId: 1, caseId: 1 });

// Legacy moderation log (keeping for compatibility)
const moderationLogSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    reason: { type: String },
    moderator: { type: String },
    timestamp: { type: Date, default: Date.now },
    duration: { type: Number },
    automated: { type: Boolean, default: false },
    caseId: { type: String }
}, { timestamps: true });

// Notes on users
const noteSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    note: { type: String, required: true },
    moderator: { type: String },
    moderatorId: { type: String },
    timestamp: { type: Date, default: Date.now }
});

// Appeals
const appealSchema = new mongoose.Schema({
    appealId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    caseId: { type: String, required: true },
    reason: { type: String, required: true },
    // AI summary of appeal
    aiSummary: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
    reviewedBy: { type: String },
    reviewedById: { type: String },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// Reminders
const reminderSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    channelId: { type: String },
    privacy: { type: String, default: 'public' },
    message: { type: String, required: true },
    time: { type: Number },
    repeat: { type: Number },
    time_to_send: { type: String }
});

// Barry's memory for AI context
const barryMemorySchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    memoryType: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now }
});

// User interaction memory (for AI personality adaptation)
const userMemorySchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    // Recent interactions summary
    recentTopics: [{ type: String }],
    lastInteraction: { type: Date },
    // Personality observations
    preferredResponseStyle: { type: String },
    humorReceptiveness: { type: Number, min: 0, max: 10, default: 5 },
    // Notable interactions
    memorableExchanges: [{
        context: String,
        barryResponse: String,
        userReaction: String,
        timestamp: Date
    }]
});
userMemorySchema.index({ guildId: 1, userId: 1 }, { unique: true });

// Server state (legacy, keeping for compatibility)
const serverStateSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    maturityLevel: { type: Number, default: 0 },
    cultureNotes: { type: String },
    featureToggles: { type: mongoose.Schema.Types.Mixed },
    modTrustCalibration: { type: mongoose.Schema.Types.Mixed },
    aiBehaviorTuning: { type: mongoose.Schema.Types.Mixed },
    settings: { type: mongoose.Schema.Types.Mixed }
});

// Audit log for mod transparency
const auditLogSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    actionType: { type: String, required: true },
    targetId: { type: String },
    targetType: { type: String, enum: ['user', 'message', 'channel', 'role', 'setting'] },
    performedBy: { type: String },
    performedById: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    caseId: { type: String },
    aiExplanation: { type: String },
    severityScore: { type: Number },
    timestamp: { type: Date, default: Date.now }
});
auditLogSchema.index({ guildId: 1, timestamp: -1 });

// ===========================================
// NEW FEATURES: Games, Rules, Auto-Responses
// ===========================================

// Server Rules (editable by admins)
const serverRuleSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    number: { type: Number, required: true },
    text: { type: String, required: true },
    addedBy: { type: String },
    addedAt: { type: Date, default: Date.now }
});
serverRuleSchema.index({ guildId: 1, number: 1 }, { unique: true });

// Auto-Responses (keyword-based)
const autoResponseSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    trigger: { type: String, required: true },
    response: { type: String, required: true },
    useAI: { type: Boolean, default: false },
    addedBy: { type: String },
    addedAt: { type: Date, default: Date.now }
});
autoResponseSchema.index({ guildId: 1, trigger: 1 }, { unique: true });

// Scheduled Announcements
const scheduledAnnouncementSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    message: { type: String, required: true },
    sendAt: { type: Number, required: true },
    repeat: { type: Number }, // ms between repeats, null = no repeat
    createdBy: { type: String },
    delivered: { type: Boolean, default: false }
});
scheduledAnnouncementSchema.index({ sendAt: 1 });

// Game Scores
const gameScoreSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    gameType: { type: String, required: true },
    score: { type: Number, required: true },
    wins: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
});
gameScoreSchema.index({ guildId: 1, gameType: 1, score: 1 });

// Daily Challenge Scores
const dailyScoreSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true }, // e.g., "Mon Feb 03 2025"
    score: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});
dailyScoreSchema.index({ guildId: 1, date: 1, score: 1 });

// Reputation Tracking
const reputationLogSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    fromUserId: { type: String, required: true },
    toUserId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
reputationLogSchema.index({ guildId: 1, fromUserId: 1, toUserId: 1 });

// ===========================================
// GAME SYSTEM SCHEMAS
// ===========================================

// Game Session - Active game instance
const gameSessionSchema = new mongoose.Schema({
    gameId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String },
    hostId: { type: String, required: true },
    type: { 
        type: String, 
        required: true,
        enum: ['reflex', 'mindlock', 'bluff', 'timetrap', 'wordheist', 'chaosvote', 'buttonpanic', 'dueldraw', 'logicgrid', 'daily']
    },
    players: [{
        userId: { type: String },
        username: { type: String },
        joinedAt: { type: Date, default: Date.now },
        score: { type: Number, default: 0 },
        ready: { type: Boolean, default: false },
        eliminated: { type: Boolean, default: false },
        data: { type: mongoose.Schema.Types.Mixed } // Game-specific player data
    }],
    state: { 
        type: String, 
        enum: ['waiting', 'starting', 'active', 'round', 'voting', 'finished', 'cancelled'],
        default: 'waiting'
    },
    round: { type: Number, default: 0 },
    maxPlayers: { type: Number, default: 10 },
    minPlayers: { type: Number, default: 1 },
    gameData: { type: mongoose.Schema.Types.Mixed }, // Game-specific data
    startedAt: { type: Date },
    endedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});
gameSessionSchema.index({ guildId: 1, state: 1 });
// Note: gameId has unique: true which creates an index automatically

// Game Result - Individual player result
const gameResultSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    gameId: { type: String, required: true },
    gameType: { type: String, required: true },
    odUserId: { type: String, required: true },
    username: { type: String },
    score: { type: Number, default: 0 },
    rank: { type: Number },
    isWinner: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed }, // reaction time, accuracy, etc.
    timestamp: { type: Date, default: Date.now }
});
gameResultSchema.index({ guildId: 1, odUserId: 1, gameType: 1 });
gameResultSchema.index({ guildId: 1, gameType: 1, score: -1 });
gameResultSchema.index({ gameId: 1 });

// Achievement Definition
const achievementSchema = new mongoose.Schema({
    achievementId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, default: '🏆' },
    category: { type: String, enum: ['skill', 'funny', 'social', 'grind', 'secret'], default: 'skill' },
    hidden: { type: Boolean, default: false },
    rarity: { type: String, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'], default: 'common' },
    requirement: { type: mongoose.Schema.Types.Mixed } // Conditions to unlock
});

// User Achievement - Unlocked achievements
const userAchievementSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    odUserId: { type: String, required: true, index: true },
    achievementId: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed } // Context when unlocked
});
userAchievementSchema.index({ guildId: 1, odUserId: 1, achievementId: 1 }, { unique: true });

// Leaderboard Entry
const leaderboardEntrySchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    odUserId: { type: String, required: true, index: true },
    username: { type: String },
    gameType: { type: String, required: true },
    score: { type: Number, default: 0 },
    period: { type: String, enum: ['daily', 'weekly', 'monthly', 'alltime'], default: 'alltime' },
    periodKey: { type: String }, // e.g., "2026-02-03" for daily, "2026-W05" for weekly
    gamesPlayed: { type: Number, default: 1 },
    wins: { type: Number, default: 0 },
    bestScore: { type: Number },
    fastestTime: { type: Number },
    streak: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
});
leaderboardEntrySchema.index({ guildId: 1, gameType: 1, period: 1, wins: -1 });
leaderboardEntrySchema.index({ guildId: 1, odUserId: 1, gameType: 1, period: 1, periodKey: 1 }, { unique: true, sparse: true });

// User Game Stats - Aggregate stats
const userGameStatsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    odUserId: { type: String, required: true, index: true },
    totalGamesPlayed: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    currentWinStreak: { type: Number, default: 0 },
    bestWinStreak: { type: Number, default: 0 },
    dailyChallengeStreak: { type: Number, default: 0 },
    lastDailyPlayed: { type: String },
    // Per-game stats
    gameStats: {
        reflex: { played: { type: Number, default: 0 }, wins: { type: Number, default: 0 }, bestTime: Number },
        mindlock: { played: { type: Number, default: 0 }, wins: { type: Number, default: 0 }, bestLevel: Number },
        bluff: { played: { type: Number, default: 0 }, wins: { type: Number, default: 0 }, successfulBluffs: Number },
        timetrap: { played: { type: Number, default: 0 }, wins: { type: Number, default: 0 }, bestAccuracy: Number },
        wordheist: { played: { type: Number, default: 0 }, wins: { type: Number, default: 0 }, bestRound: Number },
        chaosvote: { played: { type: Number, default: 0 }, wins: { type: Number, default: 0 }, timesVoted: Number },
        buttonpanic: { played: { type: Number, default: 0 }, wins: { type: Number, default: 0 }, falseClicks: Number },
        dueldraw: { played: { type: Number, default: 0 }, wins: { type: Number, default: 0 }, fastestDraw: Number },
        logicgrid: { played: { type: Number, default: 0 }, wins: { type: Number, default: 0 }, bestTime: Number },
        daily: { played: { type: Number, default: 0 }, wins: { type: Number, default: 0 }, streak: Number }
    },
    updatedAt: { type: Date, default: Date.now }
});
userGameStatsSchema.index({ guildId: 1, odUserId: 1 }, { unique: true });

// Active Users - Immune to auto-moderation
const activeUserSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    username: { type: String },
    addedBy: { type: String },
    addedById: { type: String },
    reason: { type: String },
    addedAt: { type: Date, default: Date.now }
});
activeUserSchema.index({ guildId: 1, userId: 1 }, { unique: true });

// Daily Challenge Config (one per day, global)
const dailyChallengeSchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true }, // "2026-02-03"
    gameType: { type: String, required: true },
    config: { type: mongoose.Schema.Types.Mixed }, // Game-specific config
    participants: { type: Number, default: 0 },
    topScore: { type: Number },
    topUserId: { type: String }
});

// Daily Result - tracks who completed daily challenge (per user per day)
const dailyResultSchema = new mongoose.Schema({
    date: { type: String, required: true }, // "2026-02-03"
    guildId: { type: String, required: true },
    odUserId: { type: String, required: true },
    score: { type: Number, required: true },
    completedAt: { type: Date, default: Date.now }
});
dailyResultSchema.index({ date: 1, guildId: 1, odUserId: 1 }, { unique: true });

// AI Prompt Cache - Store AI responses to avoid wasting tokens on repeated questions
const aiPromptCacheSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    promptHash: { type: String, required: true }, // Hash of the original message
    originalPrompt: { type: String, required: true },
    response: { type: String, required: true },
    model: { type: String }, // Which AI model generated this
    context: { type: mongoose.Schema.Types.Mixed }, // Context used
    createdAt: { type: Date, default: Date.now }
});
aiPromptCacheSchema.index({ guildId: 1, userId: 1, promptHash: 1 }, { unique: true });
aiPromptCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 }); // 7 days TTL

module.exports = {
    // Layer 1: Rules
    OffensiveWord: mongoose.model('OffensiveWord', offensiveWordSchema),
    ServerSettings: mongoose.model('ServerSettings', serverSettingsSchema),
    // Layer 2: AI Context
    User: mongoose.model('User', userSchema),
    UserMemory: mongoose.model('UserMemory', userMemorySchema),
    // Layer 3: Memory/Logging
    ModerationCase: mongoose.model('ModerationCase', moderationCaseSchema),
    ModerationLog: mongoose.model('ModerationLog', moderationLogSchema),
    Note: mongoose.model('Note', noteSchema),
    Appeal: mongoose.model('Appeal', appealSchema),
    Reminder: mongoose.model('Reminder', reminderSchema),
    BarryMemory: mongoose.model('BarryMemory', barryMemorySchema),
    ServerState: mongoose.model('ServerState', serverStateSchema),
    AuditLog: mongoose.model('AuditLog', auditLogSchema),
    // New Features
    ServerRule: mongoose.model('ServerRule', serverRuleSchema),
    AutoResponse: mongoose.model('AutoResponse', autoResponseSchema),
    ScheduledAnnouncement: mongoose.model('ScheduledAnnouncement', scheduledAnnouncementSchema),
    GameScore: mongoose.model('GameScore', gameScoreSchema),
    DailyScore: mongoose.model('DailyScore', dailyScoreSchema),
    ReputationLog: mongoose.model('ReputationLog', reputationLogSchema),
    // Game System
    GameSession: mongoose.model('GameSession', gameSessionSchema),
    GameResult: mongoose.model('GameResult', gameResultSchema),
    Achievement: mongoose.model('Achievement', achievementSchema),
    UserAchievement: mongoose.model('UserAchievement', userAchievementSchema),
    LeaderboardEntry: mongoose.model('LeaderboardEntry', leaderboardEntrySchema),
    UserGameStats: mongoose.model('UserGameStats', userGameStatsSchema),
    DailyChallenge: mongoose.model('DailyChallenge', dailyChallengeSchema),
    DailyResult: mongoose.model('DailyResult', dailyResultSchema),
    // Active Users (immune to auto-mod)
    ActiveUser: mongoose.model('ActiveUser', activeUserSchema),
    // AI System
    AIPromptCache: mongoose.model('AIPromptCache', aiPromptCacheSchema)
};
