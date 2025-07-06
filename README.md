> **AI-powered Discord Bot!** <img src="https://cdn.jsdelivr.net/gh/edent/SuperTinyIcons/images/svg/discord.svg" alt="Discord Logo" width="30" bottom="3px" style="vertical-align:middle;"/>

---

## 🌟 Introduction
Meet **Barry Bot** — your server’s resident wisecracker, trivia champ, and all-around digital pal! Barry’s got a quick wit, a big heart, and just enough sass to keep things interesting. Whether you need a clever comeback, a friendly nudge, or someone to keep the peace, Barry’s always ready to jump in and make your Discord feel like home (with a few jokes along the way).

---

## 📝 Description

Barry is a fun, AI-powered, and witty Discord bot built with Node.js, Discord.js, and OpenAI. He can chat in character, answer questions wisely, and keep your server lively and safe. Whether you need a moderator, a trivia master, or just a friend to banter with, Barry’s got you covered!

---

## ✨ Features

- 🤖 **AI Personality** — Barry chats, jokes, and responds in character
- 🛡️ **Moderation** — Keeps your server safe from spam and bad vibes
- 🎲 **Games & Fun** — Play games and enjoy interactive features
- 📚 **Smart Q&A** — Ask Barry anything, get wise (or witty) answers
- 📈 **Activity Tracking** — Monitors user activity and engagement
- 📝 **Logging & Reports** — Keeps moderators in the loop
- ⚙️ **Customizable** — Tweak Barry’s personality and rules

---

## 🧰 Tech Stack

- Node.js
- Discord.js
- dotenv
- OpenAI API
- JSON for data storage

---

## 🚀 Installation

1. **Clone the repo:**
   ```bash
   git clone https://github.com/raximnuraliyev/Barry-Discord-Bot.git
   cd Barry-Discord-Bot
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure environment:**
   - Create a `.env` file:
     ```env
     BOT_TOKEN=your_discord_bot_token
     OPENROUTER_API_KEY=your_openrouter_api_key (optional)
     ```
4. **Start Barry:**
   ```bash
   npm start
   ```

---

## 💡 Usage

- **Chat with Barry:**
  ```
  @Barry tell me a joke!
  ```
- **Ask a question:**
  ```
  /askbarry What's the meaning of life?
  ```
- **Moderate users:**
  ```
  /warn @user Please be kind!
  /timeout @user 60 Spamming
  ```

Barry will reply in character, keep things fun, and help manage your community!

---

## 🛠️ Commands

| Command                                   | Description                    |
|--------------------------------------------|--------------------------------|
| `/askbarry`                               | Ask Barry anything             |
| `/report [user]`                          | View user's moderation history |
| `/note [user] [note]`                     | Add private moderator notes    |
| `/serverstats`                            | Show server statistics         |
| `/optoutcheckins`                         | Opt out of inactivity check-ins|
| `/warn [user] [reason]`                   | Warn a user                    |
| `/timeout [user] [duration] [reason]`     | Timeout a user                 |

---

## 🤝 Contributing

We welcome all friendly faces! To contribute:
1. Fork this repo
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Open a pull request with a kind note

> _Thank you for helping Barry grow!_
