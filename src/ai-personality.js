const axios = require('axios');
const { BarryMemory } = require('./models');


class PersonalityHandler {
    constructor() {
        this.loadPersonalityData();
        this.lastResponseTime = new Map();
        this.cooldownPeriod = 30000; // 30 seconds between responses per user
    }

    async loadPersonalityData() {
        try {
            const mem = await BarryMemory.findOne({ guildId: 'global', memoryType: 'personality' });
            if (mem && mem.data) {
                this.personalityData = mem.data;
            } else {
                this.personalityData = { greetings: [], insults: [], goodnight: [], questions: [], humor: [] };
            }
        } catch (error) {
            console.error('Failed to load personality data:', error);
            this.personalityData = { greetings: [], insults: [], goodnight: [], questions: [], humor: [] };
        }
    }

    // Main entry: context-aware, memory-influenced, probabilistic reply
    // Major update: AI-only, context/maturity/decision system, no canned/keyword logic
    async generateResponse(message, context = [], channelType = 'general', userProfile = {}, isMod = false, timeOfDay = null, maturity = 2) {
        const userId = message.author.id;
        const now = Date.now();
        // Maturity scale: 0=new, 1=experienced, 2=veteran
        // Higher maturity = more restraint, less frequent replies, more judgment
        const maturityLevel = typeof maturity === 'number' ? maturity : 2;
        // Decision: Should Barry reply?
        if (!isMod && maturityLevel > 0) {
            // Veteran: 60% ignore, Experienced: 40% ignore, New: 20% ignore
            const ignoreChance = maturityLevel === 2 ? 0.6 : maturityLevel === 1 ? 0.4 : 0.2;
            if (Math.random() < ignoreChance) return null;
        }
        // Cooldown: Barry doesn't reply too often
        if (this.lastResponseTime.has(userId)) {
            const timeSince = now - this.lastResponseTime.get(userId);
            if (timeSince < this.cooldownPeriod && Math.random() < 0.8) return null;
        }
        // Intent classification (AI prompt only, not keyword)
        // Compose memory/context for prompt
        const memory = await this.getBarryMemory(userId, channelType, isMod);
        const prompt = this.composePrompt(message, context, channelType, userProfile, memory, isMod, timeOfDay, maturityLevel);
        // DeepSeek via OpenRouter (AI-only)
        let aiReply = null;
        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model:'mistralai/devstral-2512:free',
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: message.content }
                ],
                max_tokens: 64,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            aiReply = response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error('AI Response Error:', error.response?.data || error.message);
            aiReply = null;
        }
        // Update cooldown
        this.lastResponseTime.set(userId, now);
        // Restraint: Sometimes say nothing even if AI replies
        if (!aiReply || aiReply.length < 2) return null;
        if (aiReply.length > 120 && Math.random() < 0.7) aiReply = aiReply.split('. ')[0] + '.';
        return aiReply;
    }

    // No longer used: intent is handled by AI prompt, not keywords

    async getBarryMemory(userId, channelType, isMod) {
        // In production, aggregate from MongoDB. Here, return example memory.
        return {
            lastJoke: 'Remember when I roasted Dave yesterday?',
            modRespect: isMod ? 'Be a bit more professional.' : '',
            channelHabit: channelType === 'mods' ? 'Be transparent.' : '',
        };
    }

    composePrompt(message, context, channelType, userProfile, memory, isMod, timeOfDay, maturityLevel) {
        // Compose a system prompt for DeepSeek
        let prompt = `You are Barry, a Canadian Discord manager. Your tone is dry, witty, and quietly supportive. You have a stable, consistent personality: you use 'howdy' casually, are modest, sometimes dramatic for comedic effect, and make fun of yourself. You enforce rules with humor and calm authority. You never use emojis. You only use phrases like "Boom", "Vroom", and "Nighty night" when appropriate. You sound like someone who's been in the server for years.\n`;
        if (memory.lastJoke) prompt += `You recently joked: "${memory.lastJoke}"\n`;
        if (memory.modRespect) prompt += `You are talking to a mod. ${memory.modRespect}\n`;
        if (memory.channelHabit) prompt += `Channel habit: ${memory.channelHabit}\n`;
        if (userProfile && userProfile.reputation) prompt += `This user is considered ${userProfile.reputation}.\n`;
        if (timeOfDay === 'latenight') prompt += `It's late. Use "Nighty night" naturally if appropriate.\n`;
        if (context && context.length > 0) {
            prompt += `Recent conversation:\n`;
            context.slice(-8).forEach(msg => {
                prompt += `${msg.author}: ${msg.content}\n`;
            });
        }
        // Maturity-based restraint
        if (maturityLevel === 2) {
            prompt += `You are a veteran: you reply less, ignore bait, use fewer words, and de-escalate calmly.\n`;
        } else if (maturityLevel === 1) {
            prompt += `You are experienced: you reply thoughtfully, avoid drama, and use humor with restraint.\n`;
        } else {
            prompt += `You are new: you are a bit more eager, but still calm and in control.\n`;
        }
        prompt += `Before replying, always decide: Is my response useful? Will replying help or make things worse? Is silence better? Silence is valid. Never over-explain, never say "as an AI". Keep replies short and in character.\n`;
        return prompt;
    }

    // REMOVED: All canned/keyword logic. Barry is now AI-only.


    // REMOVED: All canned/keyword logic. Barry is now AI-only.
}

module.exports = PersonalityHandler;