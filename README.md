#  Barry Discord Bot

<div align="center">

![Stars](https://img.shields.io/github/stars/raximnuraliyev/Barry-Discord-Bot?style=for-the-badge&color=ffb700)
![License](https://img.shields.io/github/license/raximnuraliyev/Barry-Discord-Bot?style=for-the-badge&color=00d4ff)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-13aa52?style=for-the-badge)

**A powerful, AI-driven Discord bot for moderation, gaming, and interactive engagement**

[Features](#-features)  [Quick Start](#-quick-start)  [Commands](#-commands)  [Tech Stack](#-tech-stack)  [Contributing](#-contributing)

</div>

---

##  Overview

Barry is a sophisticated Discord bot that combines **AI-powered interactions**, **intelligent moderation**, **interactive games**, and **persistent data storage**. Built with Node.js and Discord.js, Barry provides server administrators with powerful tools while keeping communities engaging and safe.

###  What Barry Does

-  **AI Conversations** - Dynamically generated responses powered by OpenRouter
-  **Smart Moderation** - Automatic spam detection with escalating actions and comprehensive logging
-  **Interactive Games** - Mind Lock puzzles, Logic Grid challenges, and more
-  **Persistent Storage** - All data backed by MongoDB for reliability
-  **Reminders** - User-configurable reminders with scheduling
-  **Server Analytics** - Track activity, user stats, and moderation history

---

##  Features

###  AI-Powered Responses
- **Context-Aware Interactions** - Responses adapt to server settings and user history
- **Multiple Model Fallback** - Automatically switches between free AI models for reliability
- **Dynamic Personality** - Tone and humor level configurable per server

###  Advanced Moderation
- **Automatic Spam Detection** - Escalates from warnings to timeouts to bans
- **Invite & Filter Protection** - Blocks Discord invites and detects obfuscated banned words
- **Moderation Logging** - Complete audit trail in MongoDB
- **Mod Notifications** - Instant alerts for rule violations via DM and channel

###  Interactive Games
- **Mind Lock** - Memory-based puzzle game with leaderboards
- **Logic Grid** - Sequence solving challenges
- **Button-Based UI** - Intuitive interaction system

###  Data Persistence
- **MongoDB Integration** - Reliable cloud-based storage
- **User Profiles** - Track stats, warnings, and preferences
- **Server Memory** - Remember settings and history per server

---

##  Quick Start

### Prerequisites
- Node.js v18 or higher
- Discord bot token
- MongoDB Atlas account (free tier available)
- OpenRouter API key (free tier available)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/raximnuraliyev/Barry-Discord-Bot.git
cd Barry-Discord-Bot

# 2. Install dependencies
npm install

# 3. Create .env file with your credentials
cat > .env << EOF
BOT_TOKEN=your_discord_bot_token_here
OPENROUTER_API_KEY=your_openrouter_key_here
MONGODB_URI=your_mongodb_connection_string
EOF

# 4. Start the bot
npm run dev
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_TOKEN` | Discord bot authentication token | `MTk4NjIyNDgzNzA2...` |
| `OPENROUTER_API_KEY` | API key for AI model access | `sk-or-v1-...` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@...` |

---

##  Commands

### User Commands
| Command | Description |
|---------|-------------|
| `/askbarry <question>` | Ask Barry a question - get an AI-generated response |
| `/remindme <time> <message>` | Set a personal reminder |
| `/game <type>` | Play interactive games (Mind Lock, Logic Grid, etc.) |
| `/optoutcheckins` | Opt out of activity notifications |

### Moderator Commands
| Command | Description |
|---------|-------------|
| `/warn <user> <reason>` | Issue a warning to a user |
| `/timeout <user> <duration> <reason>` | Temporarily mute a user |
| `/ban <user> <reason>` | Ban a user from the server |
| `/note <user> <note>` | Add a private moderation note |
| `/report <user>` | View a user''s moderation history |
| `/serverstats` | Display server statistics |
| `/alert <reason>` | Notify all moderators |
| `/inactiveusers` | List inactive users |
| `/listwords` | View banned words list |

---

##  Tech Stack

<div align="center">

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js |
| **Discord Library** | Discord.js v14 |
| **AI Provider** | OpenRouter (multiple free models) |
| **Database** | MongoDB Atlas |
| **Language** | JavaScript (ES6+) |

</div>

### Architecture

```

      Discord Server                     
  (User Messages & Interactions)         

               
               

      Barry Bot (Node.js)                
     
    Commands Handler                  
    Moderation System                 
    Game Logic                        
    AI Response Engine                
     

          
    
                          
  
 MongoDB  OpenRouter Moderation
  Atlas      API       Logger  
  
```

---

##  How It Works

### Command Flow
1. User sends command in Discord
2. Barry validates permissions and syntax
3. Executes appropriate handler (AI, moderation, game, etc.)
4. Stores result in MongoDB
5. Returns response to user

### AI Response Pipeline
1. User message received
2. Context gathered from server settings and user history
3. Prompt constructed with personality settings
4. Sent to OpenRouter with primary AI model
5. If rate-limited, automatically switches to backup model
6. Response returned with static fallback if all models fail

### Moderation Pipeline
1. Message analyzed for violations (spam, invites, banned words)
2. Violation logged to database
3. Escalating action taken (warn  timeout  ban)
4. Moderators notified via DM and channel
5. Complete audit trail maintained

---

##  Game System

Barry includes an interactive game framework with:
- **Button-based UI** for responsive interactions
- **Leaderboard tracking** with player stats
- **Session management** with automatic cleanup
- **Real-time feedback** and hints system

Currently available games:
-  **Mind Lock** - Memory puzzle challenges
-  **Logic Grid** - Sequence solving puzzles
-  **More coming soon!**

---

##  Data & Privacy

- **MongoDB Storage**: All user data, reminders, and logs stored securely in MongoDB
- **No Local Files**: No sensitive data stored locally
- **Audit Trails**: Complete moderation action history
- **User Controls**: Commands to opt out of tracking features

---

##  Project Structure

```
Barry-Discord-Bot/
 index.js              # Entry point & event routing
 src/
    commands.js       # Slash command handlers
    games.js          # Game logic and interactions
    moderation.js     # Moderation system
    ai-personality.js # AI response generation
    reminders.js      # Reminder scheduling
    database.js       # Database utilities
    models.js         # Mongoose schemas
    mongo.js          # MongoDB connection
 package.json
 .env                  # Configuration (git-ignored)
```

---

##  Getting Help

- **Documentation**: Check the source code comments
- **Issues**: Open an issue on GitHub for bugs
- **Discussions**: Use GitHub Discussions for questions

---

##  Contributing

We welcome contributions! To get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Workflow
```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# The bot will automatically reload on file changes
```

---

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with  for Discord communities**

[ Back to top](#-barry-discord-bot)

</div>
