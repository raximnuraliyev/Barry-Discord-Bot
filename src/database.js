const fs = require('fs');
const path = require('path');

class DatabaseHandler {
    constructor() {
        this.dataFile = path.join(__dirname, '..', 'database.json');
        this.ensureDataFile();
    }

    ensureDataFile() {
        if (!fs.existsSync(this.dataFile)) {
            const initialData = {
                users: {},
                actions: [],
                notes: {},
                settings: {}
            };
            fs.writeFileSync(this.dataFile, JSON.stringify(initialData, null, 2));
        }
    }

    loadData() {
        try {
            return JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        } catch (error) {
            console.error('Failed to load database:', error);
            return { users: {}, actions: [], notes: {}, settings: {} };
        }
    }

    saveData(data) {
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save database:', error);
        }
    }

    getUserData(userId, guildId) {
        const data = this.loadData();
        const key = `${userId}-${guildId}`;
        return data.users[key] || {
            userId: userId,
            guildId: guildId,
            strikes: 0,
            lastActivity: Date.now(),
            optedOutCheckins: false,
            missedCheckins: 0
        };
    }

    updateUserData(userId, guildId, updateData) {
        const data = this.loadData();
        const key = `${userId}-${guildId}`;
        
        if (!data.users[key]) {
            data.users[key] = this.getUserData(userId, guildId);
        }
        
        Object.assign(data.users[key], updateData);
        this.saveData(data);
    }

    updateUserActivity(userId, guildId) {
        this.updateUserData(userId, guildId, {
            lastActivity: Date.now()
        });
    }

    updateUserStrikes(userId, guildId, strikes) {
        this.updateUserData(userId, guildId, {
            strikes: strikes
        });
    }

    logAction(actionData) {
        const data = this.loadData();
        data.actions.push({
            id: Date.now() + Math.random(),
            ...actionData
        });
        this.saveData(data);
    }

    getUserActions(userId, guildId) {
        const data = this.loadData();
        return data.actions.filter(action => 
            action.userId === userId && action.guildId === guildId
        );
    }

    addNote(userId, guildId, note, moderator) {
        const data = this.loadData();
        const key = `${userId}-${guildId}`;
        
        if (!data.notes[key]) {
            data.notes[key] = [];
        }
        
        data.notes[key].push({
            note: note,
            moderator: moderator,
            timestamp: new Date().toISOString()
        });
        
        this.saveData(data);
    }

    getUserNotes(userId, guildId) {
        const data = this.loadData();
        const key = `${userId}-${guildId}`;
        return data.notes[key] || [];
    }

    getInactiveUsers(guildId, daysInactive = 7) {
        const data = this.loadData();
        const cutoff = Date.now() - (daysInactive * 24 * 60 * 60 * 1000);
        
        return Object.values(data.users)
            .filter(user => 
                user.guildId === guildId && 
                user.lastActivity < cutoff && 
                !user.optedOutCheckins
            );
    }

    getServerStats(guildId) {
        const data = this.loadData();
        const now = Date.now();
        const dayAgo = now - (24 * 60 * 60 * 1000);
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
        
        const todayActions = data.actions.filter(action => 
            action.guildId === guildId && 
            new Date(action.timestamp).getTime() > dayAgo
        );
        
        const weekActions = data.actions.filter(action => 
            action.guildId === guildId && 
            new Date(action.timestamp).getTime() > weekAgo
        );
        
        return {
            totalUsers: Object.values(data.users).filter(u => u.guildId === guildId).length,
            actionsToday: todayActions.length,
            actionsThisWeek: weekActions.length,
            bansThisWeek: weekActions.filter(a => a.action === 'ban').length,
            mutesThisWeek: weekActions.filter(a => a.action === 'timeout').length,
            warningsThisWeek: weekActions.filter(a => a.action === 'warn').length
        };
    }

    optOutCheckins(userId, guildId) {
        this.updateUserData(userId, guildId, {
            optedOutCheckins: true
        });
    }

    incrementMissedCheckins(userId, guildId) {
        const userData = this.getUserData(userId, guildId);
        this.updateUserData(userId, guildId, {
            missedCheckins: userData.missedCheckins + 1
        });
    }

    resetMissedCheckins(userId, guildId) {
        this.updateUserData(userId, guildId, {
            missedCheckins: 0
        });
    }
}

module.exports = DatabaseHandler;