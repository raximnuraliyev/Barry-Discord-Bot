# Barry: The AI-Driven Discord Server Manager Bot

Barry is a comprehensive Discord moderation and community management bot with a dynamic AI-powered personality system. He's designed to be both a reliable moderator and an engaging community member with his own unique character.

## Features

### 🤖 AI Personality System
- Dynamic responses based on message content and context
- Personality-driven interactions with server members
- Configurable response categories (greetings, humor, insults, etc.)
- Optional integration with OpenRouter API for advanced AI responses

### 🛡️ Advanced Moderation
- Automatic offensive language detection
- Progressive punishment system (warn → timeout → ban)
- Spam detection and prevention
- Unauthorized invite link removal
- Suspicious account monitoring
- Raid detection and alerts

### 📊 Activity Monitoring
- User activity tracking
- Inactivity check-ins with personalized messages
- Automatic flagging of inactive users to moderators
- Opt-out system for check-ins

### 📝 Logging & Reporting
- Comprehensive action logging
- Private moderator channel (#barry-mods)
- User moderation history reports
- Server statistics and analytics
- Moderator notes system

### 🔧 Slash Commands
- `/askbarry` - Ask Barry a question
- `/report [user]` - View user's moderation history
- `/note [user] [note]` - Add private moderator notes
- `/serverstats` - Display server statistics
- `/optoutcheckins` - Opt out of inactivity check-ins
- `/warn [user] [reason]` - Warn a user
- `/timeout [user] [duration] [reason]` - Timeout a user

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables in `.env`:
   ```
   BOT_TOKEN=your_discord_bot_token
   OPENROUTER_API_KEY=your_openrouter_api_key (optional)
   ```
4. Start the bot:
   ```bash
   npm start
   ```

## Configuration

### Bot Permissions Required
- Read Messages
- Send Messages
- Manage Messages
- Kick Members
- Ban Members
- Moderate Members (Timeout)
- Manage Channels
- View Audit Log

### Environment Variables
- `BOT_TOKEN`: Your Discord bot token (required)
- `OPENROUTER_API_KEY`: OpenRouter API key for AI responses (optional)

## File Structure

```
├── index.js                 # Main bot entry point
├── src/
│   ├── ai-personality.js    # AI personality handler
│   ├── moderation.js        # Moderation functions
│   ├── database.js          # Database operations
│   ├── commands.js          # Slash command handlers
│   └── inactivity.js        # Inactivity monitoring
├── barry-personality.json   # Personality response database
├── database.json           # User data and logs
└── README.md               # This file
```

## Personality System

Barry's personality is driven by:

1. **JSON Response Bank**: Categorized responses for different situations
2. **Keyword Detection**: Context-aware response selection
3. **AI Integration**: Optional OpenRouter API for dynamic responses
4. **Cooldown System**: Prevents spam while maintaining engagement

### Personality Categories
- **Greetings**: Welcome messages and hellos
- **Insults**: Friendly banter and playful roasts
- **Goodnight**: Sleep-related responses
- **Questions**: Responses to user questions
- **Humor**: Jokes and funny remarks
- **Random**: Miscellaneous personality responses

## Moderation Features

### Automatic Actions
- **First Offense**: Warning
- **Second Offense**: Timeout (configurable duration)
- **Third Offense**: Ban

### Detection Systems
- Offensive language filtering
- Spam detection (repeated messages)
- Invite link scanning
- Account age verification
- Raid detection (multiple rapid joins)

### Logging
All moderation actions are logged with:
- User information
- Action type and reason
- Moderator (human or auto)
- Timestamp
- Strike count

## Database Structure

The bot uses a JSON file database with the following structure:

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

## Usage Examples

### Basic Interaction
```
User: @Barry how are you?
Barry: Better than you, obviously.
```

### Moderation Commands
```
/warn @user Spamming in general chat
/timeout @user 60 Repeated rule violations
/report @user
```

### Server Management
```
/serverstats
/note @user Helpful community member
```

## Customization

### Adding New Personality Responses
Edit `barry-personality.json` to add new responses to any category:

```json
{
  "greetings": [
    "Your new greeting here"
  ]
}
```

### Modifying Offensive Words
Edit the `offensiveWords` array in `src/moderation.js`:

```javascript
this.offensiveWords = [
  'word1', 'word2', 'word3'
];
```

### Adjusting Inactivity Settings
Modify the check interval in `index.js` or database settings:

```javascript
// Check every 6 hours (adjust as needed)
setInterval(() => {
  this.inactivity.checkInactiveUsers(this.client);
}, 6 * 60 * 60 * 1000);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues or questions, please create an issue on the GitHub repository.