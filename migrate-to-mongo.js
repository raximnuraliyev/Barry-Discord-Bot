// One-time migration script: Run ONCE, then delete!
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectMongo = require('./src/mongo');
const models = require('./src/models');

async function migrate() {
  await connectMongo();

  // Users, actions, notes, settings
  const dbPath = path.join(__dirname, 'database.json');
  if (fs.existsSync(dbPath)) {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    // Users
    for (const key in db.users) {
      await models.User.updateOne(
        { userId: db.users[key].userId, guildId: db.users[key].guildId },
        db.users[key],
        { upsert: true }
      );
    }
    // Actions (Moderation Logs)
    for (const action of db.actions) {
      await models.ModerationLog.updateOne(
        { id: action.id },
        action,
        { upsert: true }
      );
    }
    // Notes
    for (const key in db.notes) {
      for (const note of db.notes[key]) {
        await models.Note.updateOne(
          { userId: note.userId || key.split('-')[0], guildId: note.guildId || key.split('-')[1], note: note.note, timestamp: note.timestamp },
          { ...note, userId: note.userId || key.split('-')[0], guildId: note.guildId || key.split('-')[1] },
          { upsert: true }
        );
      }
    }
    // Server settings/state
    await models.ServerState.updateOne(
      { guildId: 'global' },
      { ...db.settings, guildId: 'global' },
      { upsert: true }
    );
    console.log('Migrated database.json');
  }

  // Reminders
  const remindersPath = path.join(__dirname, 'reminders.json');
  if (fs.existsSync(remindersPath)) {
    const reminders = JSON.parse(fs.readFileSync(remindersPath, 'utf8'));
    for (const reminder of reminders) {
      // Convert time to timestamp if it's a string
      let r = { ...reminder };
      if (typeof r.time === 'string') {
        const parsed = Date.parse(r.time);
        if (!isNaN(parsed)) r.time = parsed;
      }
      await models.Reminder.updateOne(
        { id: r.id },
        r,
        { upsert: true }
      );
    }
    console.log('Migrated reminders.json');
  }

  // Inactive users (for memory)
  const inactivePath = path.join(__dirname, 'inactive-users.json');
  if (fs.existsSync(inactivePath)) {
    const inactive = JSON.parse(fs.readFileSync(inactivePath, 'utf8'));
    for (const entry of inactive) {
      await models.BarryMemory.create({
        guildId: entry.guildId,
        memoryType: 'inactiveUser',
        data: entry,
        timestamp: new Date(entry.lastActivity)
      });
    }
    console.log('Migrated inactive-users.json');
  }

  // barry-personality.json and barry-ask-responses.json (for memory)
  const personalityPath = path.join(__dirname, 'barry-personality.json');
  if (fs.existsSync(personalityPath)) {
    const personality = JSON.parse(fs.readFileSync(personalityPath, 'utf8'));
    await models.BarryMemory.updateOne(
      { guildId: 'global', memoryType: 'personality' },
      { data: personality, timestamp: new Date() },
      { upsert: true }
    );
    console.log('Migrated barry-personality.json');
  }
  const askPath = path.join(__dirname, 'barry-ask-responses.json');
  if (fs.existsSync(askPath)) {
    const ask = JSON.parse(fs.readFileSync(askPath, 'utf8'));
    await models.BarryMemory.updateOne(
      { guildId: 'global', memoryType: 'askResponses' },
      { data: ask, timestamp: new Date() },
      { upsert: true }
    );
    console.log('Migrated barry-ask-responses.json');
  }

  // log.json (for memory)
  const logPath = path.join(__dirname, 'log.json');
  if (fs.existsSync(logPath)) {
    const logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    for (const log of logs) {
      await models.BarryMemory.create({
        guildId: 'global',
        memoryType: 'interactionLog',
        data: log,
        timestamp: log.timestamp ? new Date(log.timestamp) : new Date()
      });
    }
    console.log('Migrated log.json');
  }

  console.log('Migration complete!');
  process.exit(0);
}

migrate();
