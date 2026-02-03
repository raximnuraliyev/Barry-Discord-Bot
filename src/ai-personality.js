const axios = require('axios');
const { BarryMemory, UserMemory, ServerSettings } = require('./models');

/**
 * PersonalityHandler - Barry's AI Layer (Layer 2)
 * 
 * This handles all AI-driven interactions:
 * - Context-aware responses
 * - Emotional tone detection
 * - Punishment explanations
 * - Rule explanations
 * - Memory-influenced conversations
 */
class PersonalityHandler {
    constructor() {
        this.loadPersonalityData();
        this.lastResponseTime = new Map();
        this.cooldownPeriod = 10000; // 10 seconds between responses per user
        
        // AI Model configuration - Multiple free models for fallback (Updated Feb 2026)
        this.freeModels = [
            'meta-llama/llama-3.2-3b-instruct:free',
            'google/gemma-3-12b-it:free',
            'google/gemma-3-4b-it:free',
            'qwen/qwen2.5-vl-7b-instruct:free',
            'google/gemma-3n-e4b-it:free',
            'meta-llama/llama-3.1-405b-instruct:free'
        ];
        this.currentModelIndex = 0;
        this.aiModel = this.freeModels[0];
        this.apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
    }

    // Switch to next model on failure
    switchToNextModel() {
        this.currentModelIndex = (this.currentModelIndex + 1) % this.freeModels.length;
        this.aiModel = this.freeModels[this.currentModelIndex];
        console.log(`Switched to AI model: ${this.aiModel}`);
        return this.aiModel;
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

    /**
     * Main response generator - Context-aware, memory-influenced
     * @param {boolean} forceResponse - If true, skip random chance check (used when Barry is directly called)
     */
    async generateResponse(message, context = [], channelType = 'general', userProfile = {}, isMod = false, timeOfDay = null, maturity = 2, serverSettings = null, forceResponse = true) {
        const userId = message.author.id;
        const now = Date.now();
        
        // Get server personality settings
        const personality = serverSettings?.personalitySettings || {
            humorLevel: 5,
            strictnessLevel: 5,
            verbosityLevel: 5,
            responseChance: 100
        };

        // Decision: Should Barry reply?
        // If forceResponse is true (Barry was directly called/mentioned), always respond
        // Otherwise use server's configured response chance for ambient messages
        if (!forceResponse && !isMod) {
            const responseChance = personality.responseChance / 100;
            if (Math.random() > responseChance) {
                return null;
            }
        }

        // Cooldown check - skip if force response (Barry was called)
        if (!forceResponse && this.lastResponseTime.has(userId)) {
            const timeSince = now - this.lastResponseTime.get(userId);
            if (timeSince < this.cooldownPeriod && Math.random() < 0.7) {
                return null;
            }
        }

        // Get user memory for context
        const userMemory = await this.getUserMemory(userId, message.guild?.id);
        
        // Compose the AI prompt
        const prompt = this.composePrompt(message, context, channelType, userProfile, userMemory, isMod, timeOfDay, maturity, personality);
        
        // Call AI with fallback models
        let aiReply = null;
        let attempts = 0;
        const maxAttempts = this.freeModels.length;
        
        while (!aiReply && attempts < maxAttempts) {
            try {
                const response = await axios.post(this.apiEndpoint, {
                    model: this.aiModel,
                    messages: [
                        { role: 'system', content: prompt },
                        { role: 'user', content: message.content }
                    ],
                    max_tokens: 150,
                    temperature: 0.7 + (personality.humorLevel * 0.03)
                }, {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                });
                aiReply = response.data.choices[0].message.content.trim();
            } catch (error) {
                console.error(`AI Response Error with ${this.aiModel}:`, error.response?.data?.error?.message || error.message);
                this.switchToNextModel();
                attempts++;
            }
        }
        
        if (!aiReply) {
            console.error('All AI models failed');
            return null;
        }

        // Update cooldown
        this.lastResponseTime.set(userId, now);

        // Post-process response
        if (!aiReply || aiReply.length < 2) return null;
        
        // Trim overly long responses based on verbosity setting
        const maxLength = 80 + (personality.verbosityLevel * 20);
        if (aiReply.length > maxLength) {
            aiReply = aiReply.split('. ').slice(0, 2).join('. ') + '.';
        }

        // Update user memory with this interaction
        await this.updateUserInteraction(userId, message.guild?.id, message.content, aiReply);

        return aiReply;
    }

    /**
     * Generate AI explanation for punishment (in Barry's tone)
     */
    async generatePunishmentExplanation(action, reason, severity, userHistory, serverSettings = null) {
        const personality = serverSettings?.personalitySettings || { humorLevel: 5, strictnessLevel: 5 };
        
        const prompt = `You are Barry, a Canadian Discord server manager. Your tone is calm, dry, witty, and slightly humorous but fair.
You need to explain a moderation action to a user. Be human, not robotic. Don't lecture - just explain briefly.
${personality.humorLevel > 6 ? 'Add a touch of gentle humor to defuse tension.' : ''}
${personality.strictnessLevel > 6 ? 'Be firm but not harsh.' : 'Be understanding but clear about rules.'}

Action: ${action}
Reason: ${reason}
Severity: ${severity}
User's previous warnings: ${userHistory.length}

Write a brief 1-2 sentence explanation. Don't use emojis. Sound like a tired but caring server dad.`;

        let attempts = 0;
        while (attempts < this.freeModels.length) {
            try {
                const response = await axios.post(this.apiEndpoint, {
                    model: this.aiModel,
                    messages: [
                        { role: 'system', content: prompt },
                        { role: 'user', content: 'Explain this moderation action.' }
                    ],
                    max_tokens: 100,
                    temperature: 0.6
                }, {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                return response.data.choices[0].message.content.trim();
            } catch (error) {
                console.error(`AI Explanation Error with ${this.aiModel}:`, error.response?.data?.error?.message || error.message);
                this.switchToNextModel();
                attempts++;
            }
        }
        return `You've been ${action}ed for: ${reason}. Please review our server rules.`;
    }

    /**
     * Generate AI explanation for a rule
     */
    async generateRuleExplanation(rule, context = '', serverSettings = null) {
        const personality = serverSettings?.personalitySettings || { humorLevel: 5 };
        
        const prompt = `You are Barry, a Canadian Discord server manager with a dry wit.
A user is asking why something is banned/not allowed. Explain the rule in your style.
Be brief, clear, and slightly witty. Don't be preachy.
${personality.humorLevel > 6 ? 'Add a small joke if appropriate.' : ''}

Rule/word being asked about: ${rule}
${context ? `Context: ${context}` : ''}

Explain why this rule exists in 2-3 sentences max. Sound like a reasonable person, not a rulebook.`;

        let attempts = 0;
        while (attempts < this.freeModels.length) {
            try {
                const response = await axios.post(this.apiEndpoint, {
                    model: this.aiModel,
                    messages: [
                        { role: 'system', content: prompt },
                        { role: 'user', content: `Why is "${rule}" banned?` }
                    ],
                    max_tokens: 120,
                    temperature: 0.6
                }, {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                return response.data.choices[0].message.content.trim();
            } catch (error) {
                console.error(`AI Rule Explanation Error with ${this.aiModel}:`, error.response?.data?.error?.message || error.message);
                this.switchToNextModel();
                attempts++;
            }
        }
        return `That's against our community guidelines. We want everyone to feel welcome here.`;
    }

    /**
     * Summarize an appeal for moderators
     */
    async summarizeAppeal(appeal, caseDetails, userHistory) {
        const prompt = `You are Barry, helping moderators review an appeal.
Summarize this appeal objectively and briefly. Note any relevant context.

Appeal reason: ${appeal.reason}
Original action: ${caseDetails.action}
Original reason: ${caseDetails.reason}
User's warning history: ${userHistory.length} previous warnings

Provide a 2-3 sentence neutral summary and any recommendation. Be fair.`;

        let attempts = 0;
        while (attempts < this.freeModels.length) {
            try {
                const response = await axios.post(this.apiEndpoint, {
                    model: this.aiModel,
                    messages: [
                        { role: 'system', content: prompt },
                        { role: 'user', content: 'Summarize this appeal.' }
                    ],
                    max_tokens: 150,
                    temperature: 0.4
                }, {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                return response.data.choices[0].message.content.trim();
            } catch (error) {
                console.error(`AI Appeal Summary Error with ${this.aiModel}:`, error.response?.data?.error?.message || error.message);
                this.switchToNextModel();
                attempts++;
            }
        }
        return `User appeals ${caseDetails.action} for "${caseDetails.reason}". They say: "${appeal.reason}". Review needed.`;
    }

    /**
     * Detect emotional tone in a message
     */
    async detectTone(messageContent) {
        const prompt = `Analyze the emotional tone of this Discord message. Respond with ONLY one word from: neutral, joking, angry, sad, sarcastic, confused, excited

Message: "${messageContent}"

Tone:`;

        let attempts = 0;
        while (attempts < this.freeModels.length) {
            try {
                const response = await axios.post(this.apiEndpoint, {
                    model: this.aiModel,
                    messages: [
                        { role: 'system', content: prompt }
                    ],
                    max_tokens: 10,
                    temperature: 0.3
                }, {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                const tone = response.data.choices[0].message.content.trim().toLowerCase();
                const validTones = ['neutral', 'joking', 'angry', 'sad', 'sarcastic', 'confused', 'excited'];
                return validTones.includes(tone) ? tone : 'neutral';
            } catch (error) {
                console.error(`AI Tone Detection Error with ${this.aiModel}:`, error.response?.data?.error?.message || error.message);
                this.switchToNextModel();
                attempts++;
            }
        }
        return 'neutral';
    }

    /**
     * Decide whether Barry should respond to a mention
     */
    async shouldRespond(message, userProfile, channelType) {
        // Always respond to direct questions
        if (message.content.includes('?')) return true;
        
        // Higher chance for active users
        const baseChance = 0.4;
        const trustBonus = (userProfile.trustLevel || 0) * 0.02;
        const modBonus = channelType === 'mods' ? 0.2 : 0;
        
        return Math.random() < (baseChance + trustBonus + modBonus);
    }

    /**
     * Get user memory for context
     */
    async getUserMemory(userId, guildId) {
        if (!guildId) return null;
        try {
            return await UserMemory.findOne({ userId, guildId });
        } catch (error) {
            return null;
        }
    }

    /**
     * Update user interaction memory
     */
    async updateUserInteraction(userId, guildId, userMessage, barryResponse) {
        if (!guildId) return;
        try {
            await UserMemory.findOneAndUpdate(
                { userId, guildId },
                {
                    $set: { lastInteraction: new Date() },
                    $push: {
                        memorableExchanges: {
                            $each: [{
                                context: userMessage.substring(0, 100),
                                barryResponse: barryResponse.substring(0, 100),
                                timestamp: new Date()
                            }],
                            $slice: -10 // Keep last 10 exchanges
                        }
                    }
                },
                { upsert: true }
            );
        } catch (error) {
            console.error('Failed to update user memory:', error);
        }
    }

    /**
     * Compose the system prompt for AI
     */
    composePrompt(message, context, channelType, userProfile, userMemory, isMod, timeOfDay, maturityLevel, personality) {
        let prompt = `You are Barry, a Canadian Discord server manager. Your core traits:
- Dry, witty humor (level: ${personality.humorLevel}/10)
- Calm authority (strictness: ${personality.strictnessLevel}/10)
- Brief responses (verbosity: ${personality.verbosityLevel}/10)
- You use "howdy" casually, are modest, sometimes dramatic for comedic effect
- You make fun of yourself occasionally
- You NEVER use emojis
- You only use phrases like "Boom", "Vroom", "Nighty night" when natural
- You sound like someone who's been managing this server for years
- You can say "I might be wrong, but..." to show self-awareness

`;

        // Add user context if available
        if (userProfile) {
            const trust = userProfile.trustLevel || 0;
            if (trust > 3) {
                prompt += `This user is trusted (trust level: ${trust}). Be friendlier with them.\n`;
            } else if (trust < -2) {
                prompt += `This user has been problematic before. Be cautious but fair.\n`;
            }
            
            if (userProfile.behaviorProfile?.communicationStyle === 'humorous') {
                prompt += `This user likes jokes. You can be wittier with them.\n`;
            }
        }

        // Add memory context
        if (userMemory?.memorableExchanges?.length > 0) {
            const lastExchange = userMemory.memorableExchanges[userMemory.memorableExchanges.length - 1];
            prompt += `You recently told this user: "${lastExchange.barryResponse}"\n`;
        }

        // Channel context
        if (channelType === 'mods') {
            prompt += `You're in a mod channel. Be more direct and professional.\n`;
        }

        // Time context
        if (timeOfDay === 'latenight') {
            prompt += `It's late night. Use "Nighty night" if appropriate.\n`;
        }

        // Conversation context
        if (context && context.length > 0) {
            prompt += `\nRecent conversation:\n`;
            context.slice(-6).forEach(msg => {
                prompt += `${msg.author}: ${msg.content}\n`;
            });
        }

        // Maturity and restraint
        if (maturityLevel >= 2) {
            prompt += `\nYou are experienced: reply less, ignore bait, use fewer words, de-escalate calmly.`;
        }

        prompt += `\n\nBefore replying: Is my response useful? Will replying help? Is silence better?
Keep replies short (1-2 sentences max). Never say "as an AI". Stay in character.`;

        return prompt;
    }

    /**
     * Get Barry's memory for a guild
     */
    async getBarryMemory(userId, channelType, isMod) {
        return {
            modRespect: isMod ? 'Be a bit more professional.' : '',
            channelHabit: channelType === 'mods' ? 'Be transparent.' : ''
        };
    }
}

module.exports = PersonalityHandler;