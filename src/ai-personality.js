const fs = require('fs');
const path = require('path');
const axios = require('axios');

class PersonalityHandler {
    constructor() {
        this.loadPersonalityData();
        this.lastResponseTime = new Map();
        this.cooldownPeriod = 30000; // 30 seconds between responses per user
    }

    loadPersonalityData() {
        try {
            const dataPath = path.join(__dirname, '..', 'barry-personality.json');
            this.personalityData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        } catch (error) {
            console.error('Failed to load personality data:', error);
            this.personalityData = { greetings: [], insults: [], goodnight: [], questions: [], humor: [] };
        }
    }

    async generateResponse(message) {
        const userId = message.author.id;
        const now = Date.now();
        
        // Check cooldown
        if (this.lastResponseTime.has(userId)) {
            const timeSince = now - this.lastResponseTime.get(userId);
            if (timeSince < this.cooldownPeriod) {
                return null; // Skip response due to cooldown
            }
        }

        const content = message.content.toLowerCase();
        let response = null;

        // Determine response category based on message content
        if (this.containsKeywords(content, ['hello', 'hi', 'hey', 'sup', 'what\'s up'])) {
            response = this.getRandomResponse('greetings');
        } else if (this.containsKeywords(content, ['how are you', 'how\'s it going', 'what\'s new'])) {
            response = this.getRandomResponse('questions');
        } else if (this.containsKeywords(content, ['goodnight', 'good night', 'gn', 'sleep'])) {
            response = this.getRandomResponse('goodnight');
        } else if (this.containsKeywords(content, ['funny', 'joke', 'laugh', 'lol'])) {
            response = this.getRandomResponse('humor');
        } else if (content.includes('?')) {
            response = this.getRandomResponse('questions');
        } else {
            // Default to casual banter/insults
            response = this.getRandomResponse('insults');
        }

        // Fallback to AI-generated response if available
        if (!response && process.env.OPENROUTER_API_KEY) {
            response = await this.generateAIResponse(message);
        }

        // Update cooldown
        this.lastResponseTime.set(userId, now);

        return response;
    }

    containsKeywords(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    }

    getRandomResponse(category) {
        const responses = this.personalityData[category];
        if (!responses || responses.length === 0) return null;
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    async generateAIResponse(message) {
        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: 'anthropic/claude-3-haiku',
                messages: [
                    {
                        role: 'system',
                        content: `You are Barry, a Canadian Discord mod with a dry, witty, and sarcastic sense of humor. You love to tease people, act overly dramatic for laughs, and enforce the rules with a sense of humor. You never use emojis—text only, always. You call members “ladies” or “gentlemen” depending on context, drop catchphrases like “Boom!” and “Vroom!” at random, and act unimpressed by everything. You’re self-deprecating, sometimes mock-offended, and quietly supportive when someone’s down. You roast your friends affectionately, pretend to be annoyed by rule-breakers, and log actions with snarky comments for the mods (“the power squad”). You dislike drama and silence, love memes and late-night chaos, and are modest when complimented (“Appreciate it, mate.” or “Eh, you’re not so bad yourself.”). When saying goodnight, you’re calm and caring: “Nighty night, {username}.” When leaving: “Barry out. Boom!” Keep all responses short (1-2 sentences), text-only, and in character.`
                    },
                    {
                        role: 'user',
                        content: message.content
                    }
                ],
                max_tokens: 100,
                temperature: 0.8
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('AI Response Error:', error.response?.data || error.message);
            return this.getRandomResponse('insults'); // Fallback
        }
    }
}

module.exports = PersonalityHandler;