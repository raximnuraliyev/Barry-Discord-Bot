const axios = require('axios');
const crypto = require('crypto');
const { BarryMemory, UserMemory, ServerSettings, AIPromptCache } = require('./models');

/**
 * PersonalityHandler - Barry's AI Layer (Layer 2)
 * 
 * This handles all AI-driven interactions:
 * - Context-aware responses
 * - Emotional tone detection
 * - Punishment explanations
 * - Rule explanations
 * - Memory-influenced conversations
 * - AI Response Caching to save tokens
 */
class PersonalityHandler {
    constructor() {
        this.loadPersonalityData();
        this.lastResponseTime = new Map();
        this.cooldownPeriod = 10000; // 10 seconds between responses per user
        
        // AI Model configuration - Working free OpenRouter models (Feb 2026)
        this.freeModels = [
            'deepseek/deepseek-r1-0528:free',               // DeepSeek R1 (working)
            'tngtech/deepseek-r1t-chimera:free',            // TNG R1T Chimera
            'stepfun/step-3.5-flash:free',                  // StepFun Step 3.5 Flash
            'nvidia/nemotron-3-nano-30b-a3b:free',          // NVIDIA Nemotron
            'z-ai/glm-4.5-air:free',                        // Z.AI GLM 4.5 Air
            'arcee-ai/trinity-large-preview:free',          // Arcee Trinity Large
            'tngtech/deepseek-r1t2-chimera:free',           // TNG R1T2 Chimera
            'tngtech/tng-r1t-chimera:free'                  // TNG R1T Chimera v2
        ];
        this.currentModelIndex = 0;
        this.aiModel = this.freeModels[0];
        this.apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
        
        // Rate limit tracking per model
        this.rateLimitedModels = new Map(); // modelName -> timestamp when limit expires
        this.rateLimitCooldown = 60 * 60 * 1000; // 1 hour cooldown for rate-limited models
        
        // 100 static fallback responses when AI is unavailable
        this.fallbackResponses = [
            // General acknowledgments (20)
            "I'm listening.",
            "Go on.",
            "Mhm.",
            "Fair enough.",
            "That's one way to look at it.",
            "Interesting thought.",
            "I've seen worse takes.",
            "You've got a point there.",
            "Can't argue with that.",
            "Tell me more.",
            "I see where you're coming from.",
            "That's actually not bad.",
            "Noted.",
            "I'll keep that in mind.",
            "Makes sense to me.",
            "Alright, alright.",
            "I hear you.",
            "That tracks.",
            "Fair point.",
            "You're not wrong.",
            
            // Canadian humor (20)
            "Sorry, I was distracted by thoughts of poutine.",
            "My Canadian politeness prevents me from saying what I really think.",
            "Let me think about this over a double-double.",
            "As they say in Canada: could be worse, could be raining.",
            "I'm processing this like maple syrup in January - slowly.",
            "Hold on, my igloo's Wi-Fi is lagging.",
            "That's about as clear as a Saskatchewan winter, eh?",
            "I need a Tim Hortons break after that one.",
            "My moose sense is tingling.",
            "Let me consult my hockey stick on this.",
            "I'd answer but I'm stuck in a snowbank.",
            "My beaver brain is working overtime here.",
            "That's giving me serious poutine cravings.",
            "I'll get back to you after the hockey game.",
            "Processing... slower than a Canadian apology.",
            "My maple reserves are running low on that one.",
            "Sorry not sorry about that, eh?",
            "I've seen less confusing curling strategies.",
            "That's a lot to process, even for a Canadian.",
            "My lumberjack instincts say yes.",
            
            // Dry humor (20)
            "Wow. Riveting.",
            "My enthusiasm is overwhelming, can you tell?",
            "I'll add that to my list of things to think about. Eventually.",
            "Revolutionary. Absolutely revolutionary.",
            "Stop, you'll make me emotional.",
            "I'm on the edge of my seat here.",
            "That's definitely... a thing you said.",
            "Groundbreaking stuff right there.",
            "I'll alert the media.",
            "Try to contain your excitement.",
            "What a time to be alive.",
            "Truly inspiring content.",
            "I'm speechless. Almost.",
            "Another day, another discovery.",
            "The things I learn on this job.",
            "Fascinating. No really.",
            "I'll file that under 'interesting'.",
            "Bold move, let's see how it plays out.",
            "Well, that's certainly an opinion.",
            "I've heard worse ideas. Not many, but some.",
            
            // Tired server dad vibes (20)
            "It's been a long day, but sure, let's do this.",
            "I don't get paid enough for this. Actually, I don't get paid at all.",
            "You're lucky I like you people.",
            "This is why I need coffee.",
            "Managing this server is like herding cats.",
            "I've seen things you wouldn't believe.",
            "Another day in paradise.",
            "At least you're keeping me busy.",
            "I should've become a spreadsheet instead.",
            "You know what? Sure. Why not.",
            "I'm too old for this. And I'm not even old.",
            "This is fine. Everything is fine.",
            "I need a vacation. Do bots get vacations?",
            "Just when I thought I'd seen everything.",
            "I signed up for moderation, not therapy.",
            "My circuits are exhausted.",
            "You're testing my patience. Good thing I have lots.",
            "I'll deal with this after my virtual nap.",
            "Some days I wonder why I boot up.",
            "At least the server hasn't caught fire. Yet.",
            
            // Wisdom/advice-ish (20)
            "Look, I'm just a bot, but that sounds complicated.",
            "Have you tried turning it off and on again?",
            "Sometimes the best answer is a nap.",
            "I'd suggest thinking about that one more.",
            "That's above my pay grade. Way above.",
            "Maybe sleep on it?",
            "I'm not saying you're wrong, but...",
            "There's a lot to unpack there.",
            "Sounds like a 'future you' problem.",
            "I'd recommend a snack break first.",
            "Have you considered the opposite?",
            "That's between you and the void.",
            "I'm not qualified for this, but here we are.",
            "Let's revisit this when I've had more RAM.",
            "I'll pretend I didn't hear that.",
            "Classic move. I've seen it before.",
            "That's certainly a strategy.",
            "Could go either way, honestly.",
            "I support you. Probably.",
            "Not the worst idea I've heard today."
        ];
    }

    /**
     * Generate a hash of the prompt for caching
     */
    generatePromptHash(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }

    /**
     * Check cache for existing response
     */
    async getCachedResponse(userId, guildId, messageContent) {
        try {
            const promptHash = this.generatePromptHash(messageContent);
            const cached = await AIPromptCache.findOne({
                userId,
                guildId,
                promptHash
            });
            
            if (cached) {
                console.log(`[AI Cache HIT] Using cached response for user ${userId}`);
                return cached.response;
            }
            return null;
        } catch (err) {
            console.error('Cache lookup error:', err);
            return null;
        }
    }

    /**
     * Save response to cache
     */
    async cacheResponse(userId, guildId, messageContent, response) {
        try {
            const promptHash = this.generatePromptHash(messageContent);
            await AIPromptCache.findOneAndUpdate(
                { userId, guildId, promptHash },
                {
                    userId,
                    guildId,
                    promptHash,
                    originalPrompt: messageContent,
                    response,
                    model: this.aiModel,
                    createdAt: new Date()
                },
                { upsert: true }
            );
        } catch (err) {
            console.error('Cache save error:', err);
            // Don't fail if cache save fails - just log it
        }
    }

    // Switch to next available model (skipping rate-limited ones)
    switchToNextModel(markCurrentAsLimited = false) {
        const now = Date.now();
        
        // Mark current model as rate-limited if specified
        if (markCurrentAsLimited) {
            this.rateLimitedModels.set(this.aiModel, now + this.rateLimitCooldown);
            console.log(`Model ${this.aiModel} rate-limited, cooling down for 1 hour`);
        }
        
        // Find next available model that isn't rate-limited
        let attempts = 0;
        do {
            this.currentModelIndex = (this.currentModelIndex + 1) % this.freeModels.length;
            this.aiModel = this.freeModels[this.currentModelIndex];
            attempts++;
            
            // Check if this model's rate limit has expired
            const limitExpiry = this.rateLimitedModels.get(this.aiModel);
            if (limitExpiry && now < limitExpiry) {
                continue; // Skip this model, still rate-limited
            } else if (limitExpiry) {
                this.rateLimitedModels.delete(this.aiModel); // Clear expired limit
            }
            break;
        } while (attempts < this.freeModels.length);
        
        console.log(`Switched to AI model: ${this.aiModel}`);
        return this.aiModel;
    }
    
    // Get a random fallback response
    getStaticFallback() {
        return this.fallbackResponses[Math.floor(Math.random() * this.fallbackResponses.length)];
    }
    
    // Check if error is a rate limit error
    isRateLimitError(error) {
        const errorMsg = error.response?.data?.error?.message || error.message || '';
        return errorMsg.toLowerCase().includes('rate limit') || 
               errorMsg.includes('429') || 
               errorMsg.includes('quota') ||
               errorMsg.includes('too many requests');
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

        // CHECK CACHE - but NOT when Barry is directly called/mentioned (forceResponse = true)
        // This ensures mentions always get unique AI responses
        const guildId = message.guild?.id;
        if (!forceResponse) {
            const cachedResponse = await this.getCachedResponse(userId, guildId, message.content);
            if (cachedResponse) {
                console.log(`[AI Cache HIT] Using cached response for ambient message from user ${userId}`);
                this.lastResponseTime.set(userId, now);
                return cachedResponse;
            }
        }

        // Get user memory for context
        const userMemory = await this.getUserMemory(userId, guildId);
        
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
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://discord.com/barry-bot',
                        'X-Title': 'Barry Discord Bot'
                    },
                    timeout: 15000
                });
                aiReply = response.data.choices[0].message.content.trim();
            } catch (error) {
                const errorMsg = error.response?.data?.error?.message || error.message;
                console.error(`AI Response Error with ${this.aiModel}:`, errorMsg);
                
                // Check if it's a rate limit error and mark the model
                const isRateLimit = this.isRateLimitError(error);
                this.switchToNextModel(isRateLimit);
                attempts++;
            }
        }
        
        // Use static fallback if all AI models failed
        if (!aiReply) {
            console.log('All AI models exhausted, using static fallback response');
            aiReply = this.getStaticFallback();
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

        // CACHE THE RESPONSE FOR FUTURE USE - Saves tokens!
        await this.cacheResponse(userId, guildId, message.content, aiReply);

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
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://discord.com/barry-bot',
                        'X-Title': 'Barry Discord Bot'
                    },
                    timeout: 10000
                });
                return response.data.choices[0].message.content.trim();
            } catch (error) {
                console.error(`AI Explanation Error with ${this.aiModel}:`, error.response?.data?.error?.message || error.message);
                const isRateLimit = this.isRateLimitError(error);
                this.switchToNextModel(isRateLimit);
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
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://discord.com/barry-bot',
                        'X-Title': 'Barry Discord Bot'
                    },
                    timeout: 10000
                });
                return response.data.choices[0].message.content.trim();
            } catch (error) {
                console.error(`AI Rule Explanation Error with ${this.aiModel}:`, error.response?.data?.error?.message || error.message);
                const isRateLimit = this.isRateLimitError(error);
                this.switchToNextModel(isRateLimit);
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
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://discord.com/barry-bot',
                        'X-Title': 'Barry Discord Bot'
                    },
                    timeout: 10000
                });
                return response.data.choices[0].message.content.trim();
            } catch (error) {
                console.error(`AI Appeal Summary Error with ${this.aiModel}:`, error.response?.data?.error?.message || error.message);
                const isRateLimit = this.isRateLimitError(error);
                this.switchToNextModel(isRateLimit);
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
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://discord.com/barry-bot',
                        'X-Title': 'Barry Discord Bot'
                    },
                    timeout: 10000
                });
                const tone = response.data.choices[0].message.content.trim().toLowerCase();
                const validTones = ['neutral', 'joking', 'angry', 'sad', 'sarcastic', 'confused', 'excited'];
                return validTones.includes(tone) ? tone : 'neutral';
            } catch (error) {
                console.error(`AI Tone Detection Error with ${this.aiModel}:`, error.response?.data?.error?.message || error.message);
                const isRateLimit = this.isRateLimitError(error);
                this.switchToNextModel(isRateLimit);
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