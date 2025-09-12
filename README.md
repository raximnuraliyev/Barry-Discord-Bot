# Barry Discord Bot

![GitHub repo](https://img.shields.io/github/stars/raximnuraliyev/Barry-Discord-Bot?style=social)
![License](https://img.shields.io/github/license/raximnuraliyev/Barry-Discord-Bot)

---

## What's New (Sep 2025)


**What's Working (Sep 2025):**
- Invite moderation: Barry deletes Discord server invites and escalates punishments for repeat offenders.
- Obfuscated word filtering: Detects and deletes disguised banned words.
- `/alert` command: Notifies all mods in #barry-mods and DMs them with a reason.
- Inactivity reporting: Daily and periodic checks, mod notifications, and user tracking.


## Table of Contents
- [Introduction](#introduction)
- [Description](#description)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Commands](#commands)
- [Required JSON Files](#required-json-files)
- [Contributing](#contributing)

---

## Introduction
Meet **Barry Bot** — your server’s resident wisecracker, trivia champ, and all-around digital pal! Barry’s got a quick wit, a big heart, and just enough sass to keep things interesting. Whether you need a clever comeback, a friendly nudge, or someone to keep the peace, Barry’s always ready to jump in and make your Discord feel like home (with a few jokes along the way).

---

## Description
Barry is a fun, AI-powered, and witty Discord bot built with Node.js, Discord.js, and OpenAI. He can chat in character, answer questions wisely, and keep your server lively and safe. Whether you need a moderator, a trivia master, or just a friend to banter with, Barry’s got you covered!

---

## Features

**AI Personality** — Barry chats, jokes, and responds in character
**Moderation** — Keeps your server safe from spam, invites, and bad vibes
**Smart Q&A** — Ask Barry anything, get wise (or witty) answers
**Activity Tracking** — Monitors user activity and engagement
**Logging & Reports** — Keeps moderators in the loop
**Invite Link Protection** — Deletes Discord server invites, escalates punishments for repeat offenders
**Obfuscated Word Filtering** — Detects banned words even if disguised
**/alert Command** — Lets anyone quickly notify all mods

---

## Tech Stack
- Node.js
- Discord.js
- dotenv
- OpenAI API
- JSON for data storage

---

## Installation

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

## Usage


**Chat with Barry:**
```
@Barry tell me a joke!
```
**Ask a question:**
```
/askbarry What's the meaning of life?
```
**Moderate users:**
```
/warn @user Please be kind!
/timeout @user 60 Spamming
```

Barry will reply in character, keep things fun, and help manage your community!

---

## Commands

| Command                                   | Description                    |
|--------------------------------------------|--------------------------------|
| `/askbarry [question]`                    | Ask Barry anything             |
| `/report [user]`                          | View a user's moderation history (mods only) |
| `/note [user] [note]`                     | Add a private note about a user (mods only) |
| `/serverstats`                            | View server statistics (mods only) |
| `/optoutcheckins`                         | Opt out of inactivity check-ins |
| `/warn [user] [reason]`                   | Warn a user (mods only)         |
| `/timeout [user] [duration] [reason]`     | Timeout a user (mods only)      |
| `/inactiveusers`                          | Show the list of currently inactive users (mods only) |
| `/alert [reason]`                         | Notify all mods about rule-adjacent behavior |
| `/remindme [time] [message] [repeat] [privacy]` | Set a reminder (with optional repeat and privacy) |

---

## Required JSON Files


Barry Bot uses several JSON files for data storage and configuration. Make sure these files exist in your project root (they can be empty or pre-filled as needed):

- `barry-ask-responses.json` — Custom Q&A responses
- `barry-personality.json` — Personality traits and dialogue
- `database.json` — User stats and moderation logs
- `inactive-users.json` — Inactivity tracking
- `reminder.json` — Stores user reminders and scheduling data


You can create these files manually or copy them from a template if provided. They are ignored by git for privacy and security.

---

## Contributing

We welcome all friendly faces! To contribute:
1. Fork this repo
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Open a pull request with a kind note

> _Thank you for helping Barry grow!_