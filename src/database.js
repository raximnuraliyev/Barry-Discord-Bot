
const mongoose = require('mongoose');
const connectMongo = require('./mongo');
const { User, ModerationLog, Note, ServerState } = require('./models');

class DatabaseHandler {
    constructor() {
        // Mongo connection is now handled in index.js before bot startup
    }

    async getUserData(userId, guildId) {
        let user = await User.findOne({ userId, guildId });
        if (!user) {
            user = await User.create({ userId, guildId, lastActivity: Date.now() });
        }
        return user;
    }

    async updateUserData(userId, guildId, updateData) {
        await User.updateOne(
            { userId, guildId },
            { $set: updateData },
            { upsert: true }
        );
    }

    async updateUserActivity(userId, guildId) {
        await this.updateUserData(userId, guildId, { lastActivity: Date.now() });
    }

    async updateUserStrikes(userId, guildId, strikes) {
        await this.updateUserData(userId, guildId, { strikes });
    }

    async logAction(actionData) {
        await ModerationLog.create({
            ...actionData,
            timestamp: new Date()
        });
    }

    async getUserActions(userId, guildId) {
        return ModerationLog.find({ userId, guildId }).sort({ timestamp: -1 });
    }

    async addNote(userId, guildId, note, moderator) {
        await Note.create({
            userId,
            guildId,
            note,
            moderator,
            timestamp: new Date()
        });
    }

    async getUserNotes(userId, guildId) {
        return Note.find({ userId, guildId }).sort({ timestamp: -1 });
    }

    // REMOVED: getInactiveUsers and all inactivity/check-in logic
    async getServerStats(guildId) {
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const [totalUsers, todayActions, weekActions] = await Promise.all([
            User.countDocuments({ guildId }),
            ModerationLog.countDocuments({ guildId, timestamp: { $gt: new Date(dayAgo) } }),
            ModerationLog.find({ guildId, timestamp: { $gt: new Date(weekAgo) } })
        ]);
        const bansThisWeek = weekActions.filter(a => a.action === 'ban').length;
        const mutesThisWeek = weekActions.filter(a => a.action === 'timeout').length;
        const warningsThisWeek = weekActions.filter(a => a.action === 'warn').length;
        return {
            totalUsers,
            actionsToday: todayActions,
            actionsThisWeek: weekActions.length,
            bansThisWeek,
            mutesThisWeek,
            warningsThisWeek
        };
    }

    // REMOVED: optOutCheckins, incrementMissedCheckins, resetMissedCheckins
}

module.exports = DatabaseHandler;