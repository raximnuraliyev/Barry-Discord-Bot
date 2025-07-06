# <img src="https://cdn-icons-png.flaticon.com/512/5968/5968756.png" alt="Barry Bot" width="40"/> Barry: The AI-Driven Discord Server Manager Bot

> **Barry** is a next-generation Discord moderation and community management bot, powered by AI and designed to be both a reliable moderator and a vibrant, engaging server member with a unique personality.

---

## ✨ Features

### 🤖 AI Personality System
- Dynamic, context-aware responses
- Configurable personality categories (greetings, humor, insults, etc.)
- Optional OpenRouter API integration for advanced AI replies

### 🛡️ Advanced Moderation
- Automatic offensive language & spam detection
- Progressive punishments (warn → timeout → ban)
- Invite link & suspicious account monitoring
- Raid detection & alerts

### 📊 Activity Monitoring
- Tracks user activity & inactivity
- Personalized inactivity check-ins
- Flags inactive users for moderators
- Opt-out system for check-ins

### 📝 Logging & Reporting
- Comprehensive action logging
- Private moderator channel (`#barry-mods`)
- User moderation history & analytics
- Moderator notes system

### 🔧 Slash Commands
- `/askbarry` — Ask Barry a question
- `/report [user]` — View user's moderation history
- `/note [user] [note]` — Add private moderator notes
- `/serverstats` — Display server statistics
- `/optoutcheckins` — Opt out of inactivity check-ins
- `/warn [user] [reason]` — Warn a user
- `/timeout [user] [duration] [reason]` — Timeout a user

---

## 🚀 Quick Start

```bash
# 1. Clone the repository
$ git clone https://github.com/raximnuraliyev/Barry-Discord-Bot.git

# 2. Install dependencies
$ npm install

# 3. Configure environment variables in `.env`
BOT_TOKEN=your_discord_bot_token
OPENROUTER_API_KEY=your_openrouter_api_key (optional)

# 4. Start the bot
$ npm start
```

---

## ⚙️ Configuration

### Required Bot Permissions
- Read/Send/Manage Messages
- Kick/Ban/Timeout Members
- Manage Channels
- View Audit Log

### Environment Variables
- `BOT_TOKEN` — Your Discord bot token (**required**)
- `OPENROUTER_API_KEY` — OpenRouter API key (**optional**)

---

## 📁 File Structure

```text
barry-bot/
├── index.js                  # Main bot entry point
├── src/
│   ├── ai-personality.js     # AI personality handler
│   ├── moderation.js         # Moderation functions
│   ├── database.js           # Database operations
│   ├── commands.js           # Slash command handlers
│   └── inactivity.js         # Inactivity monitoring
├── barry-personality.json    # Personality response database
├── database.json             # User data and logs
└── README.md                 # This file
```

---

## 🧠 Personality System
- **JSON Response Bank:** Categorized responses for different situations
- **Keyword Detection:** Context-aware response selection
- **AI Integration:** Optional OpenRouter API for dynamic replies
- **Cooldown System:** Prevents spam, keeps Barry engaging

**Categories:**
- Greetings, Insults, Goodnight, Questions, Humor, Random

---

## 🛡️ Moderation Features
- **Automatic Actions:**
  - 1st Offense: Warning
  - 2nd Offense: Timeout
  - 3rd Offense: Ban
- **Detection:**
  - Offensive language, spam, invite links, account age, raids
- **Logging:**
  - User, action, reason, moderator, timestamp, strike count

---

## 🗄️ Database Structure

<details>
<summary>Click to expand JSON structure</summary>

```json
{
  "users": {
    "userId-guildId": {
      "userId": "string",
      "guildId": "string",
      "strikes": "number",
      "lastActivity": "timestamp",
      "optedOutCheckins": "boolean",
      "missedCheckins": "number"
    }
  },
  "actions": [
    {
      "id": "unique_id",
      "userId": "string",
      "guildId": "string",
      "action": "warn|timeout|ban|kick",
      "reason": "string",
      "moderator": "string",
      "timestamp": "ISO_string",
      "duration": "number (optional)"
    }
  ],
  "notes": {
    "userId-guildId": [
      {
        "note": "string",
        "moderator": "string",
        "timestamp": "ISO_string"
      }
    ]
  },
  "settings": {
    "inactivityDays": "number",
    "maxMissedCheckins": "number"
  }
}
```
</details>

---

## 💬 Usage Examples

```text
User: @Barry how are you?
Barry: Better than you, obviously.

/warn @user Spamming in general chat
/timeout @user 60 Repeated rule violations
/report @user
/serverstats
/note @user Helpful community member
```

---

## 🛠️ Customization

- **Add Personality Responses:** Edit `barry-personality.json`
- **Change Offensive Words:** Edit `offensiveWords` in `src/moderation.js`
- **Adjust Inactivity:** Change interval in `index.js` or database settings

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

MIT License

---

## 💡 Support

For issues or questions, [create an issue](https://github.com/raximnuraliyev/Barry-Discord-Bot/issues) on GitHub.