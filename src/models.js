const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  username: { type: String },
  strikes: { type: Number, default: 0 },
  lastActivity: { type: Number },
  lastMessage: { type: String },
  lastMessageTime: { type: Number },
  inviteStrikes: { type: Number, default: 0 },
  spamStrikes: { type: Number, default: 0 },
  reputation: { type: Number, default: 0 },
  interactionFrequency: { type: Number, default: 0 },
  flags: { type: [String], default: [] },
  trusted: { type: Boolean, default: false },
  muted: { type: Boolean, default: false },
  restricted: { type: Boolean, default: false }
}, { timestamps: true });

const moderationLogSchema = new mongoose.Schema({
  // id field removed as unique index to prevent duplicate key errors
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  reason: { type: String },
  moderator: { type: String },
  timestamp: { type: Date, default: Date.now },
  duration: { type: Number },
  automated: { type: Boolean, default: false }
}, { timestamps: true });

const noteSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  note: { type: String, required: true },
  moderator: { type: String },
  timestamp: { type: Date, default: Date.now }
});

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

const barryMemorySchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  memoryType: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});

const serverStateSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  maturityLevel: { type: Number, default: 0 },
  cultureNotes: { type: String },
  featureToggles: { type: mongoose.Schema.Types.Mixed },
  modTrustCalibration: { type: mongoose.Schema.Types.Mixed },
  aiBehaviorTuning: { type: mongoose.Schema.Types.Mixed },
  settings: { type: mongoose.Schema.Types.Mixed }
});

module.exports = {
  User: mongoose.model('User', userSchema),
  ModerationLog: mongoose.model('ModerationLog', moderationLogSchema),
  Note: mongoose.model('Note', noteSchema),
  Reminder: mongoose.model('Reminder', reminderSchema),
  BarryMemory: mongoose.model('BarryMemory', barryMemorySchema),
  ServerState: mongoose.model('ServerState', serverStateSchema)
};
