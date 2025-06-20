require('dotenv').config();
const { Client, GatewayIntentBits, Events, Collection, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Import utilities
const { enhancedSlurModeration } = require('./utils/moderation');
const { logError, logInfo, logModeration } = require('./utils/logger');
const { saveDatabase, loadDatabase, updateUserStats } = require('./utils/database');
const jokes = require('./utils/jokes');

// Create a new client instance with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Create a collection for commands
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

// Load database
loadDatabase();

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, readyClient => {
    const message = `Benson is online! Logged in as ${readyClient.user.tag}`;
    console.log(message);
    logInfo(message);
});

// Add a large array of random questions
const randomQuestions = [
    "What's your favorite movie?",
    "If you could travel anywhere, where would you go?",
    "What's the best thing you've eaten this week?",
    "Do you have any pets?",
    "What's your favorite hobby?",
    "If you could have any superpower, what would it be?",
    "What's a fun fact about you?",
    "What's your favorite game to play?",
    "If you could meet any celebrity, who would it be?",
    "What's your go-to comfort food?",
    "What's something that made you smile today?",
    "What's your favorite season?",
    "If you could instantly learn any skill, what would it be?",
    "What's your favorite song right now?",
    "Do you prefer cats or dogs?",
    "What's your favorite way to relax?",
    "What's a goal you're working on?",
    "If you could time travel, what year would you visit?",
    "What's your favorite animated emoji?",
    "What's the last show you binge-watched?",
    "What's your favorite holiday?",
    "If you could swap lives with anyone for a day, who would it be?",
    "What's your favorite thing about Discord?",
    "What's a talent you wish you had?",
    "What's your favorite meme?",
    "What's your favorite color?",
    "What's your favorite book?",
    "What's your favorite thing to do on weekends?",
    "If you could have dinner with anyone, living or dead, who would it be?",
    "What's your favorite ice cream flavor?",
    "What's a place you want to visit someday?",
    "What's your favorite quote?",
    "What's your favorite sport?",
    "What's your favorite animal?",
    "What's your favorite pizza topping?",
    "What's your favorite thing to cook or bake?",
    "What's your favorite subject in school?",
    "What's your favorite app on your phone?",
    "What's your favorite thing about yourself?",
    "What's your favorite way to spend a rainy day?",
    "What's your favorite emoji?",
    "What's your favorite thing to do with friends?",
    "What's your favorite snack?",
    "What's your favorite thing to watch on YouTube?",
    "What's your favorite thing to draw or create?",
    "What's your favorite way to exercise?",
    "What's your favorite thing to collect?",
    "What's your favorite thing to do outdoors?",
    "What's your favorite thing to do when you're bored?",
    "What's your favorite thing to do online?"
];

// Sentiment keywords
const positiveWords = [
    'happy', 'great', 'awesome', 'fantastic', 'good', 'amazing', 'love', 'excited', 'joy', 'yay', 'wonderful', 'cool', 'fun', 'best', 'nice', 'glad', 'smile', 'success', 'win', 'proud', 'celebrate'
];
const negativeWords = [
    'sad', 'tired', 'bad', 'depressed', 'unhappy', 'angry', 'mad', 'hate', 'cry', 'upset', 'bored', 'lonely', 'anxious', 'stress', 'stressed', 'worried', 'pain', 'hurt', 'fail', 'lost', 'sorry', 'problem', 'trouble', 'sick', 'ill', 'down', 'struggle', 'hard', 'difficult', 'frustrated', 'overwhelmed'
];

// Track recent user moods
const userMood = {};

// Track recent messages per channel to detect user-to-user conversations
const channelUserHistory = {};

function detectSentiment(text) {
    const lower = text.toLowerCase();
    if (negativeWords.some(word => lower.includes(word))) return 'negative';
    if (positiveWords.some(word => lower.includes(word))) return 'positive';
    return 'neutral';
}

// Simple conversation state tracking
const userConversationState = {};

// Function to get AI response from OpenRouter
async function getAIResponse(userMessage) {
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'openai/gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are Benson, a friendly and helpful Discord bot.' },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 150,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        if (response.data && response.data.choices && response.data.choices[0].message && response.data.choices[0].message.content) {
            return response.data.choices[0].message.content.trim();
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error getting AI response from OpenRouter:', error);
        logError(`AI Response Error: ${error.message}`);
        return null;
    }
}

// Helper to get dynamic AI response for any message type
async function getDynamicAIResponse(userMessage, contextType) {
    let systemPrompt = 'You are Benson, a friendly, supportive, and fun Discord bot.';
    if (contextType === 'support') {
        systemPrompt += ' The user seems sad or stressed. Respond with empathy, encouragement, or motivation.';
    } else if (contextType === 'celebrate') {
        systemPrompt += ' The user seems happy or excited. Respond with celebration, positivity, or fun.';
    } else if (contextType === 'random') {
        systemPrompt += ' Respond with a fun, playful, or motivational message. Keep it light and engaging.';
    }
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'openai/gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 120,
                temperature: 0.85
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        if (response.data && response.data.choices && response.data.choices[0].message && response.data.choices[0].message.content) {
            return response.data.choices[0].message.content.trim();
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error getting dynamic AI response:', error);
        logError(`Dynamic AI Response Error: ${error.message}`);
        return null;
    }
}

function shouldBotReply(message) {
    const channelId = message.channel.id;
    if (!channelUserHistory[channelId]) channelUserHistory[channelId] = [];
    
    // Add this message to history (ignore bot messages)
    if (!message.author.bot) {
        channelUserHistory[channelId].push(message.author.id);
        if (channelUserHistory[channelId].length > 10) channelUserHistory[channelId].shift();
    }
    
    // Always reply if mentioned or replied to
    if (message.mentions.has(client.user)) return true;
    if (message.reference) {
        if (message.reference.messageId && message.channel.messages) {
            // Try to fetch the replied-to message
            return message.fetchReference().then(refMsg => refMsg.author.id === client.user.id).catch(() => false);
        }
    }
    
    // If the last 3 non-bot messages are from 2 or more unique users (not the bot), stay silent
    const recent = channelUserHistory[channelId].slice(-3);
    const unique = [...new Set(recent.filter(id => id !== client.user?.id))];
    if (unique.length >= 2) return false;
    
    return true;
}

// User-specific timeout if they tell the bot to shut up
const userTimeouts = {};
const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes in ms

function isUserTimedOut(userId) {
    if (!userTimeouts[userId]) return false;
    if (Date.now() > userTimeouts[userId]) {
        delete userTimeouts[userId];
        return false;
    }
    return true;
}

// Handle slash commands
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
        updateUserStats(interaction.user.id, 'commandsUsed');
    } catch (error) {
        console.error('Error executing command:', error);
        logError(`Command Error (${interaction.commandName}): ${error.message}`);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('There was an error while executing this command!')
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
});

// Handle regular messages
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    // CRITICAL: Check for slurs FIRST before any other processing
    if (await enhancedSlurModeration(message)) {
        // If slur was found and user was banned, stop all further processing
        return;
    }

    // Update user stats
    updateUserStats(message.author.id, 'messagesSent');

    // Handle prefix commands
    if (message.content.startsWith('!')) {
        const args = message.content.slice(1).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        try {
            switch (commandName) {
                case 'joke':
                    const joke = jokes[Math.floor(Math.random() * jokes.length)];
                    await message.reply(joke);
                    updateUserStats(message.author.id, 'commandsUsed');
                    break;

                case 'quote':
                    const quotes = [
                        "The only way to do great work is to love what you do. - Steve Jobs",
                        "Innovation distinguishes between a leader and a follower. - Steve Jobs",
                        "Life is what happens to you while you're busy making other plans. - John Lennon",
                        "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
                        "It is during our darkest moments that we must focus to see the light. - Aristotle",
                        "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill"
                    ];
                    const quote = quotes[Math.floor(Math.random() * quotes.length)];
                    
                    const quoteEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('💭 Inspirational Quote')
                        .setDescription(quote)
                        .setTimestamp();
                    
                    await message.reply({ embeds: [quoteEmbed] });
                    updateUserStats(message.author.id, 'commandsUsed');
                    break;

                case 'stats':
                    const database = require('./database.json');
                    const userStats = database.users[message.author.id] || { messagesSent: 0, commandsUsed: 0 };
                    
                    const statsEmbed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle(`📊 Stats for ${message.author.username}`)
                        .addFields(
                            { name: '💬 Messages Sent', value: userStats.messagesSent.toString(), inline: true },
                            { name: '⚡ Commands Used', value: userStats.commandsUsed.toString(), inline: true }
                        )
                        .setThumbnail(message.author.displayAvatarURL())
                        .setTimestamp();
                    
                    await message.reply({ embeds: [statsEmbed] });
                    updateUserStats(message.author.id, 'commandsUsed');
                    break;
            }
        } catch (error) {
            console.error('Error executing prefix command:', error);
            logError(`Prefix Command Error (${commandName}): ${error.message}`);
        }
        return;
    }

    // If user is timed out but says "come back", remove timeout and reply
    if (isUserTimedOut(message.author.id)) {
        if (message.content.toLowerCase().includes('come back') && message.mentions.has(client.user)) {
            delete userTimeouts[message.author.id];
            await message.reply("I'm back! Thanks for inviting me to chat again! 😊");
        }
        return;
    }

    // Timeout logic: if user says "shut up" to the bot, mute for 5 minutes
    if (message.content.toLowerCase().includes('shut up') && message.mentions.has(client.user)) {
        userTimeouts[message.author.id] = Date.now() + TIMEOUT_DURATION;
        await message.reply("Okay, I'll be quiet for a bit! 🤫");
        return;
    }

    const shouldReply = await shouldBotReply(message);
    if (!shouldReply) return;

    try {
        const userId = message.author.id;
        const content = message.content.trim();

        // Sentiment detection
        const sentiment = detectSentiment(content);
        userMood[userId] = sentiment;

        // Dynamic AI for supportive/celebratory/neutral
        let contextType = 'random';
        if (sentiment === 'negative') contextType = 'support';
        if (sentiment === 'positive') contextType = 'celebrate';

        // If message is a question, use original AI logic
        if (content.endsWith('?') || content.includes('?')) {
            await message.channel.sendTyping();
            let aiResponse = await getAIResponse(content);
            if (aiResponse) {
                aiResponse = aiResponse.replace(/How can I assist you today\??/gi, 'hru');
                await message.reply(aiResponse);
                userConversationState[userId] = 'asked_question';
                return;
            } else {
                await message.reply("Sorry, I'm having trouble thinking right now!");
                return;
            }
        }

        // Otherwise, use dynamic AI for all other messages
        await message.channel.sendTyping();
        let aiDynamic = await getDynamicAIResponse(content, contextType);
        if (aiDynamic) {
            await message.reply(aiDynamic);
        } else {
            // fallback to static reply if AI fails
            const fallbackReplies = [
                "That's interesting! Tell me more!",
                "I hear you! 😊",
                "Thanks for sharing that with me!",
                "That's cool! What else is on your mind?",
                "I appreciate you chatting with me!"
            ];
            const reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
            await message.reply(reply);
        }

        // Optionally, follow up with a random question to keep chat going
        if (Math.random() < 0.3) { // Reduced probability to 30%
            const question = randomQuestions[Math.floor(Math.random() * randomQuestions.length)];
            setTimeout(async () => {
                try {
                    await message.reply(question);
                } catch (error) {
                    console.error('Error sending follow-up question:', error);
                }
            }, 2000); // Wait 2 seconds before asking question
        }
    } catch (error) {
        console.error('Error processing message:', error);
        logError(`Message Processing Error: ${error.message}`);
    }
});

// Error handling
client.on(Events.Error, error => {
    console.error('Discord client error:', error);
    logError(`Discord Client Error: ${error.message}`);
});

// Handle process termination gracefully
process.on('SIGINT', () => {
    console.log('\nShutting down Benson gracefully...');
    logInfo('Bot shutting down gracefully (SIGINT)');
    saveDatabase();
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down Benson gracefully...');
    logInfo('Bot shutting down gracefully (SIGTERM)');
    saveDatabase();
    client.destroy();
    process.exit(0);
});

// Auto-save database every 5 minutes
setInterval(() => {
    saveDatabase();
}, 5 * 60 * 1000);

// Login to Discord with your bot's token
const token = process.env.BOT_TOKEN;

if (!token) {
    console.error('No bot token provided! Please set the BOT_TOKEN in your .env file.');
    process.exit(1);
}

client.login(token).catch(error => {
    console.error('Failed to login:', error);
    logError(`Login Error: ${error.message}`);
    process.exit(1);
});