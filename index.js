require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const axios = require('axios');
const slurs = require('./slurs');

// Create a new client instance with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, readyClient => {
    console.log(`Barry is online! Logged in as ${readyClient.user.tag}`);
});



// Utility function to normalize message content for matching
function normalizeMessage(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z]/g, '') // remove non-letters
        .replace(/(y{2,}|h{2,}|i{2,}|e{2,}|o{2,}|a{2,}|u{2,}|s{2,}|t{2,}|k{2,}|n{2,}|g{2,}|d{2,}|m{2,}|l{2,}|c{2,}|r{2,}|w{2,}|b{2,}|f{2,}|p{2,}|v{2,}|z{2,})/g, match => match[0]); // collapse repeated letters
}

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
const channelMessageHistory = {};
const BOT_USERNAMES = [client.user?.username || 'Barry']; // fallback if not ready

function detectSentiment(text) {
    const lower = text.toLowerCase();
    if (negativeWords.some(word => lower.includes(word))) return 'negative';
    if (positiveWords.some(word => lower.includes(word))) return 'positive';
    return 'neutral';
}

// Simple conversation state tracking
const userConversationState = {};

// Function to get AI response from OpenRouter (free tier)
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
        return null;
    }
}

// Improved: Only reply if not interrupting a conversation between 2+ users
const channelUserHistory = {};

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

// Function to check for slurs and moderate
async function moderateSlurs(message) {
    const content = message.content;
    // Check every word in the message for slurs
    const words = content.split(/\s+/);
    for (const word of words) {
        for (const slur of slurs) {
            if (!slur.trim()) continue;
            // Check if the word includes the slur (case-insensitive, partial match)
            if (word.toLowerCase().includes(slur.toLowerCase())) {
                try {
                    console.log(`[MODERATION] Slur detected from user ${message.author.tag} (${message.author.id}): "${slur}" in word "${word}"`);
                    await message.reply('⚠️ Please do not use bad words or slurs. Continued use will result in a ban.');
                    await message.member.ban({ reason: `Used slur: ${slur}` });
                    console.log(`[MODERATION] User ${message.author.tag} (${message.author.id}) was banned for slur usage.`);
                } catch (err) {
                    console.error('[MODERATION] Failed to ban user or send warning:', err);
                }
                return true;
            }
        }
    }
    return false;
}

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;
    // Slur moderation: ban and warn if slur detected
    if (await moderateSlurs(message)) return;
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
        const normalized = normalizeMessage(content);
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
            const allReplies = funReplies.concat(playfulReplies);
            const reply = allReplies[Math.floor(Math.random() * allReplies.length)];
            await message.reply(reply);
        }
        // Optionally, follow up with a random question to keep chat going
        if (Math.random() < 0.5) {
            const question = randomQuestions[Math.floor(Math.random() * randomQuestions.length)];
            await message.reply(question);
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }
});

// Error handling
client.on(Events.Error, error => {
    console.error('Error processing message:', error);
});

// Handle process termination gracefully
process.on('SIGINT', () => {
    console.log('\nShutting down Benson gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down Benson gracefully...');
    client.destroy();
    process.exit(0);
});

// Login to Discord with your bot's token
const token = process.env.BOT_TOKEN;

if (!token) {
    console.error('No bot token provided! Please set the BOT_TOKEN in your .env file.');
    process.exit(1);
}

client.login(token).catch(error => {
    console.error('Failed to login:', error);
    process.exit(1);
});