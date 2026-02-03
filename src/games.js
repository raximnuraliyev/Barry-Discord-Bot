const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { 
    GameSession, GameResult, Achievement, UserAchievement, 
    LeaderboardEntry, UserGameStats, DailyChallenge, DailyResult 
} = require('./models');

/**
 * Barry's Game System
 * Clean embeds, button-based interactions, persistent stats
 */
class GameHandler {
    constructor() {
        this.activeSessions = new Map(); // gameId -> session data
        this.achievements = this.initAchievements();
        
        // Barry's game commentary
        this.barryComments = {
            gameStart: [
                "Alright, who's got quick hands today.",
                "Let's see what you've got.",
                "Time to separate the legends from the... others.",
                "This should be interesting."
            ],
            win: [
                "Clean win. Respect.",
                "And that's how it's done.",
                "Didn't even break a sweat, huh?",
                "Winner winner."
            ],
            lose: [
                "Happens to the best of us.",
                "Better luck next time.",
                "That was... something.",
                "We don't talk about this one."
            ],
            close: [
                "That was way too close.",
                "Photo finish right there.",
                "Milliseconds matter, people.",
                "My circuits are still processing that one."
            ]
        };
    }

    getComment(type) {
        const comments = this.barryComments[type] || this.barryComments.gameStart;
        return comments[Math.floor(Math.random() * comments.length)];
    }

    generateGameId() {
        return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // ===========================================
    // ACHIEVEMENT DEFINITIONS
    // ===========================================

    initAchievements() {
        return [
            // Skill achievements
            { achievementId: 'too_fast', name: 'Too Fast', description: 'Win Reflex Roulette in under 200ms', icon: '⚡', category: 'skill', rarity: 'rare' },
            { achievementId: 'lightning', name: 'Lightning Reflexes', description: 'Win Reflex Roulette in under 150ms', icon: '🌩️', category: 'skill', rarity: 'epic' },
            { achievementId: 'perfect_timing', name: 'Perfect Timing', description: 'Hit exactly 5.00s in Time Trap', icon: '⏱️', category: 'skill', rarity: 'legendary' },
            { achievementId: 'memory_master', name: 'Memory Master', description: 'Complete Mind Lock level 10', icon: '🧠', category: 'skill', rarity: 'epic' },
            { achievementId: 'quick_draw', name: 'Quick Draw', description: 'Win a Duel Draw in under 100ms', icon: '🤠', category: 'skill', rarity: 'rare' },
            
            // Funny achievements
            { achievementId: 'cold_hands', name: 'Cold Hands', description: 'Lose 5 duels in a row', icon: '🥶', category: 'funny', rarity: 'uncommon' },
            { achievementId: 'impulse_control', name: 'Impulse Control: Failed', description: 'Click a fake button in Button Panic', icon: '🤦', category: 'funny', rarity: 'common' },
            { achievementId: 'too_slow', name: 'Took Your Time', description: 'React slower than 2 seconds', icon: '🐌', category: 'funny', rarity: 'common' },
            { achievementId: 'early_bird', name: 'Early Bird', description: 'Click before the button appears', icon: '🐦', category: 'funny', rarity: 'common' },
            { achievementId: 'bad_bluffer', name: 'Terrible Poker Face', description: 'Get caught bluffing 5 times', icon: '🎭', category: 'funny', rarity: 'uncommon' },
            
            // Social achievements
            { achievementId: 'social_menace', name: 'Social Menace', description: 'Win Chaos Vote 3 times', icon: '😈', category: 'social', rarity: 'uncommon' },
            { achievementId: 'crowd_favorite', name: 'Crowd Favorite', description: 'Get the most votes in Chaos Vote 5 times', icon: '🌟', category: 'social', rarity: 'rare' },
            { achievementId: 'word_wizard', name: 'Word Wizard', description: 'Contribute 50 words in Word Heist', icon: '📚', category: 'social', rarity: 'uncommon' },
            
            // Grind achievements
            { achievementId: 'daily_grinder', name: 'Daily Grinder', description: 'Complete 7 daily challenges in a row', icon: '📅', category: 'grind', rarity: 'rare' },
            { achievementId: 'dedicated', name: 'Dedicated', description: 'Play 100 games total', icon: '💪', category: 'grind', rarity: 'uncommon' },
            { achievementId: 'veteran', name: 'Veteran', description: 'Play 500 games total', icon: '🎖️', category: 'grind', rarity: 'rare' },
            { achievementId: 'legend', name: 'Legend', description: 'Win 100 games total', icon: '👑', category: 'grind', rarity: 'epic' },
            { achievementId: 'streak_master', name: 'On Fire', description: 'Win 10 games in a row', icon: '🔥', category: 'grind', rarity: 'epic' },
            
            // Secret achievements
            { achievementId: 'flawless', name: 'Flawless', description: '???', icon: '💎', category: 'secret', hidden: true, rarity: 'legendary' },
            { achievementId: 'night_owl', name: 'Night Owl', description: '???', icon: '🦉', category: 'secret', hidden: true, rarity: 'uncommon' },
            { achievementId: 'speed_demon', name: 'Speed Demon', description: '???', icon: '👹', category: 'secret', hidden: true, rarity: 'legendary' }
        ];
    }

    async seedAchievements() {
        for (const ach of this.achievements) {
            await Achievement.findOneAndUpdate(
                { achievementId: ach.achievementId },
                { $set: ach },
                { upsert: true }
            );
        }
    }

    // ===========================================
    // GAME 1: REFLEX ROULETTE
    // ===========================================

    async startReflexRoulette(interaction, maxPlayers = 10) {
        const gameId = this.generateGameId();
        const session = {
            gameId,
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
            hostId: interaction.user.id,
            type: 'reflex',
            players: [{ 
                odUserId: interaction.user.id, 
                username: interaction.user.username,
                ready: true 
            }],
            state: 'waiting',
            maxPlayers,
            minPlayers: 1,
            gameData: { clickTimes: {} }
        };

        this.activeSessions.set(gameId, session);

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('⚡ Reflex Roulette')
            .setDescription(`${this.getComment('gameStart')}\n\n**Players:** 1/${maxPlayers}\n• ${interaction.user.username}`)
            .addFields({ name: 'How to Play', value: 'Wait for the button to turn **GREEN**, then click as fast as you can!\nFirst click wins.' })
            .setFooter({ text: `Game ID: ${gameId} • Hosted by ${interaction.user.username}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`game_join_${gameId}`).setLabel('Join Game').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`game_start_${gameId}`).setLabel('Start').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`game_cancel_${gameId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        session.messageId = message.id;

        // Save to DB
        await GameSession.create(session);

        return session;
    }

    async runReflexGame(interaction, session) {
        session.state = 'starting';
        this.activeSessions.set(session.gameId, session);

        // Update embed to "Get Ready"
        const readyEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('⚡ Reflex Roulette')
            .setDescription('🔴 **GET READY...**\n\nWait for the GREEN button!')
            .setFooter({ text: 'Do NOT click yet!' });

        await interaction.update({ embeds: [readyEmbed], components: [] });

        // Random delay 1-6 seconds
        const delay = Math.floor(Math.random() * 5000) + 1000;
        
        await new Promise(resolve => setTimeout(resolve, delay));

        // Check if game was cancelled
        if (!this.activeSessions.has(session.gameId)) return;

        session.state = 'active';
        session.gameData.startTime = Date.now();
        this.activeSessions.set(session.gameId, session);

        // Show the GO button
        const goEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('⚡ Reflex Roulette')
            .setDescription('🟢 **HIT NOW!**')
            .setTimestamp();

        const hitButton = new ButtonBuilder()
            .setCustomId(`reflex_hit_${session.gameId}`)
            .setLabel('🎯 HIT!')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(hitButton);

        const message = await interaction.message.edit({ embeds: [goEmbed], components: [row] });

        // Wait for first click (10 second timeout)
        try {
            const collected = await message.awaitMessageComponent({
                filter: i => i.customId === `reflex_hit_${session.gameId}` && 
                            session.players.some(p => p.odUserId === i.user.id),
                time: 10000,
                componentType: ComponentType.Button
            });

            const reactionTime = Date.now() - session.gameData.startTime;
            await this.handleReflexWin(collected, session, reactionTime);

        } catch {
            // Timeout - no winner
            await this.handleReflexTimeout(interaction.message, session);
        }
    }

    async handleReflexWin(interaction, session, reactionTime) {
        const winner = interaction.user;
        session.state = 'finished';
        session.endedAt = new Date();
        this.activeSessions.delete(session.gameId);

        // Determine rating
        let rating, color;
        if (reactionTime < 150) { rating = '🏆 INHUMAN!'; color = 0xFFD700; }
        else if (reactionTime < 200) { rating = '⚡ Incredible!'; color = 0x9B59B6; }
        else if (reactionTime < 300) { rating = '⭐ Excellent!'; color = 0x2ECC71; }
        else if (reactionTime < 500) { rating = '👍 Good!'; color = 0x3498DB; }
        else { rating = '👌 Decent'; color = 0x95A5A6; }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('⚡ Reflex Roulette - Results')
            .setDescription(`🎉 **${winner.username}** wins!\n\n⏱️ **${reactionTime}ms**\n${rating}`)
            .addFields({ name: 'Barry says:', value: this.getComment(reactionTime < 300 ? 'win' : 'close') })
            .setThumbnail(winner.displayAvatarURL())
            .setFooter({ text: `Game ID: ${session.gameId}` })
            .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });

        // Save result and check achievements
        await this.saveGameResult(session, winner.id, winner.username, reactionTime, true);
        await this.checkReflexAchievements(session.guildId, winner.id, reactionTime);
        await this.postToGameResults(interaction.guild, embed);
    }

    async handleReflexTimeout(message, session) {
        session.state = 'finished';
        this.activeSessions.delete(session.gameId);

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('⚡ Reflex Roulette - Timeout')
            .setDescription('⏰ Nobody clicked in time!\n\n*Barry stares disappointedly*')
            .setTimestamp();

        await message.edit({ embeds: [embed], components: [] });
    }

    async checkReflexAchievements(guildId, odUserId, reactionTime) {
        if (reactionTime < 200) await this.grantAchievement(guildId, odUserId, 'too_fast');
        if (reactionTime < 150) await this.grantAchievement(guildId, odUserId, 'lightning');
        if (reactionTime > 2000) await this.grantAchievement(guildId, odUserId, 'too_slow');
    }

    // ===========================================
    // GAME 2: MIND LOCK (Pattern Memory)
    // ===========================================

    async startMindLock(interaction, maxPlayers = 5) {
        const gameId = this.generateGameId();
        const symbols = ['🔴', '🔵', '🟢', '🟡', '🟣'];
        
        const session = {
            gameId,
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
            hostId: interaction.user.id,
            type: 'mindlock',
            players: [{ odUserId: interaction.user.id, username: interaction.user.username, ready: true, score: 0 }],
            state: 'waiting',
            maxPlayers,
            minPlayers: 1,
            round: 0,
            gameData: { 
                symbols,
                sequence: [],
                currentPlayer: 0,
                playerInputs: {}
            }
        };

        this.activeSessions.set(gameId, session);

        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('🧠 Mind Lock')
            .setDescription(`${this.getComment('gameStart')}\n\n**Players:** 1/${maxPlayers}\n• ${interaction.user.username}`)
            .addFields({ name: 'How to Play', value: 'Watch the pattern, then recreate it!\nLonger sequences = more points.' })
            .setFooter({ text: `Game ID: ${gameId}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`game_join_${gameId}`).setLabel('Join Game').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`game_start_${gameId}`).setLabel('Start').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`game_cancel_${gameId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        session.messageId = message.id;
        await GameSession.create(session);

        return session;
    }

    async runMindLockRound(interaction, session) {
        session.round++;
        session.state = 'round';
        
        // Add to sequence
        const newSymbol = session.gameData.symbols[Math.floor(Math.random() * session.gameData.symbols.length)];
        session.gameData.sequence.push(newSymbol);
        session.gameData.playerInputs = {};

        // Show sequence
        const sequenceStr = session.gameData.sequence.join(' ');
        
        const showEmbed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle(`🧠 Mind Lock - Round ${session.round}`)
            .setDescription(`**Watch carefully!**\n\n${sequenceStr}`)
            .setFooter({ text: 'Memorize this pattern...' });

        // Use message edit for subsequent rounds to avoid InteractionAlreadyReplied error
        try {
            if (interaction.message) {
                await interaction.message.edit({ embeds: [showEmbed], components: [] });
            } else {
                await interaction.update({ embeds: [showEmbed], components: [] });
            }
        } catch (e) {
            // Fallback: fetch channel and edit
            const channel = interaction.channel || await interaction.client.channels.fetch(session.channelId);
            const msg = await channel.messages.fetch(session.messageId);
            await msg.edit({ embeds: [showEmbed], components: [] });
        }

        // Wait, then hide and show buttons
        await new Promise(resolve => setTimeout(resolve, 1500 + (session.round * 500)));

        // Check if cancelled
        if (!this.activeSessions.has(session.gameId)) return;

        session.state = 'active';
        this.activeSessions.set(session.gameId, session);

        const inputEmbed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle(`🧠 Mind Lock - Round ${session.round}`)
            .setDescription(`**Now recreate the pattern!**\n\nSequence length: ${session.gameData.sequence.length}\nYour input: `)
            .setFooter({ text: 'Click the symbols in order!' });

        const symbolButtons = session.gameData.symbols.map((s, i) => 
            new ButtonBuilder()
                .setCustomId(`mindlock_${session.gameId}_${i}`)
                .setLabel(s)
                .setStyle(ButtonStyle.Secondary)
        );

        const row = new ActionRowBuilder().addComponents(symbolButtons);

        // Use channel fetch for reliable message editing
        try {
            const channel = interaction.channel || await interaction.client.channels.fetch(session.channelId);
            const msg = await channel.messages.fetch(session.messageId);
            await msg.edit({ embeds: [inputEmbed], components: [row] });
        } catch (e) {
            console.error('Failed to update Mind Lock input embed:', e.message);
        }
    }

    async handleMindLockClick(interaction, session, symbolIndex) {
        if (session.state !== 'active') {
            return await interaction.reply({ content: 'Wait for your turn!', ephemeral: true });
        }

        const userId = interaction.user.id;
        const player = session.players.find(p => p.odUserId === userId);
        if (!player) {
            return await interaction.reply({ content: 'You\'re not in this game!', ephemeral: true });
        }

        // Initialize player input array
        if (!session.gameData.playerInputs[userId]) {
            session.gameData.playerInputs[userId] = [];
        }

        // Add the clicked symbol
        const clickedSymbol = session.gameData.symbols[symbolIndex];
        session.gameData.playerInputs[userId].push(clickedSymbol);
        
        const expectedLength = session.gameData.sequence.length;
        const currentInput = session.gameData.playerInputs[userId];
        const inputStr = currentInput.join(' ');

        // Check if input is complete
        if (currentInput.length < expectedLength) {
            // Still inputting - update the embed
            const inputEmbed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle(`🧠 Mind Lock - Round ${session.round}`)
                .setDescription(`**Now recreate the pattern!**\n\nSequence length: ${expectedLength}\nYour input: ${inputStr}`)
                .setFooter({ text: `${currentInput.length}/${expectedLength} - Keep going!` });

            try {
                await interaction.update({ embeds: [inputEmbed] });
            } catch (e) {
                // Fallback to message edit
                await interaction.message.edit({ embeds: [inputEmbed] });
            }
            this.activeSessions.set(session.gameId, session);
            return;
        }

        // Input complete - check if correct
        const correctSequence = session.gameData.sequence.join(' ');
        const isCorrect = inputStr === correctSequence;

        if (isCorrect) {
            // Award points (longer sequences = more points)
            const points = session.round * 10;
            player.score += points;

            if (session.round >= 5) {
                // Game complete - show final scores
                await this.endMindLock(interaction, session, true);
            } else {
                // Continue to next round
                const successEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle(`🧠 Mind Lock - Round ${session.round} Complete!`)
                    .setDescription(`✅ **Correct!** +${points} points\n\nCurrent Score: ${player.score}`)
                    .setFooter({ text: 'Next round starting...' });

                try {
                    await interaction.update({ embeds: [successEmbed], components: [] });
                } catch (e) {
                    await interaction.message.edit({ embeds: [successEmbed], components: [] });
                }
                this.activeSessions.set(session.gameId, session);

                // Wait then start next round - use channel message instead of interaction
                const channelId = session.channelId;
                const messageId = session.messageId;
                const client = interaction.client;
                
                setTimeout(async () => {
                    try {
                        if (this.activeSessions.has(session.gameId)) {
                            const channel = await client.channels.fetch(channelId);
                            const msg = await channel.messages.fetch(messageId);
                            // Pass a mock interaction with the message for editing
                            await this.runMindLockRound({ message: msg, channel, client }, session);
                        }
                    } catch (err) {
                        console.error('Mind Lock next round error:', err.message);
                    }
                }, 2000);
            }
        } else {
            // Game over - wrong sequence
            await this.endMindLock(interaction, session, false);
        }
    }

    async endMindLock(interaction, session, completed) {
        this.activeSessions.delete(session.gameId);
        await GameSession.deleteOne({ gameId: session.gameId });

        // Get winner (highest score)
        const winner = session.players.reduce((prev, curr) => 
            (curr.score > prev.score) ? curr : prev
        );

        const color = completed ? 0x2ECC71 : 0xE74C3C;
        const title = completed ? '🧠 Mind Lock - Champion!' : '🧠 Mind Lock - Game Over!';
        
        // Get the player who made a mistake (if game ended due to wrong answer)
        const lastPlayer = session.players[0]; // For single player or find current player
        const description = completed 
            ? `**${winner.username}** completed all 5 rounds!`
            : `**${lastPlayer.username}** made a mistake!`;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(`${this.getComment('gameEnd')}\n\n${description}`)
            .addFields(
                { name: 'Final Scores', value: session.players.map(p => `${p.username}: ${p.score}`).join('\n') },
                { name: 'Rounds Completed', value: `${session.round}`, inline: true }
            )
            .setTimestamp();

        try {
            await interaction.message.edit({ embeds: [embed], components: [] });
        } catch (e) {
            // Try fetching message directly
            const channel = interaction.channel || await interaction.client.channels.fetch(session.channelId);
            const msg = await channel.messages.fetch(session.messageId);
            await msg.edit({ embeds: [embed], components: [] });
        }

        // Update stats using saveGameResult
        for (const player of session.players) {
            await this.saveGameResult(session, player.odUserId, player.username, player.score, player === winner);
        }

        // Post to game results channel
        const guild = interaction.guild || await interaction.client.guilds.fetch(session.guildId);
        await this.postToGameResults(guild, embed);
    }

    // ===========================================
    // GAME 3: BLUFF OR BUST
    // ===========================================

    async startBluffOrBust(interaction, maxPlayers = 8) {
        const gameId = this.generateGameId();
        
        const questions = [
            "What's your most embarrassing childhood memory?",
            "What's the weirdest thing you've ever eaten?",
            "What's a secret skill nobody knows you have?",
            "What would you do with a million dollars?",
            "What's your hot take that would get you cancelled?",
            "What's the longest you've gone without showering?",
            "What's the worst gift you've ever received?",
            "What's a lie you tell everyone?"
        ];

        const session = {
            gameId,
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
            hostId: interaction.user.id,
            type: 'bluff',
            players: [{ odUserId: interaction.user.id, username: interaction.user.username, ready: true, score: 0 }],
            state: 'waiting',
            maxPlayers,
            minPlayers: 3,
            round: 0,
            gameData: { 
                questions,
                currentQuestion: null,
                answers: {},
                fakeAnswer: null,
                fakeAuthor: null,
                votes: {}
            }
        };

        this.activeSessions.set(gameId, session);

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('🎭 Bluff or Bust')
            .setDescription(`${this.getComment('gameStart')}\n\n**Players:** 1/${maxPlayers} (min 3)\n• ${interaction.user.username}`)
            .addFields({ name: 'How to Play', value: 'Answer a question. One answer is FAKE.\nSpot the bluff to win!' })
            .setFooter({ text: `Game ID: ${gameId}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`game_join_${gameId}`).setLabel('Join Game').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`game_start_${gameId}`).setLabel('Start').setStyle(ButtonStyle.Success).setDisabled(true),
            new ButtonBuilder().setCustomId(`game_cancel_${gameId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        session.messageId = message.id;
        await GameSession.create(session);

        return session;
    }

    // ===========================================
    // GAME 4: TIME TRAP
    // ===========================================

    async startTimeTrap(interaction, maxPlayers = 10) {
        const gameId = this.generateGameId();
        
        const session = {
            gameId,
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
            hostId: interaction.user.id,
            type: 'timetrap',
            players: [{ odUserId: interaction.user.id, username: interaction.user.username, ready: true }],
            state: 'waiting',
            maxPlayers,
            minPlayers: 1,
            gameData: { 
                targetTime: 5000, // 5.00 seconds
                clicks: {} // odUserId -> click time
            }
        };

        this.activeSessions.set(gameId, session);

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('⏱️ Time Trap')
            .setDescription(`${this.getComment('gameStart')}\n\n**Players:** 1/${maxPlayers}\n• ${interaction.user.username}`)
            .addFields({ name: 'How to Play', value: 'Click at **exactly 5.00 seconds**!\nClosest to the target wins.' })
            .setFooter({ text: `Game ID: ${gameId}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`game_join_${gameId}`).setLabel('Join Game').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`game_start_${gameId}`).setLabel('Start').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`game_cancel_${gameId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        session.messageId = message.id;
        await GameSession.create(session);

        return session;
    }

    async runTimeTrap(interaction, session) {
        session.state = 'active';
        session.gameData.startTime = Date.now();
        session.gameData.clicks = {};
        this.activeSessions.set(session.gameId, session);

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('⏱️ Time Trap')
            .setDescription('⏳ **Timer started!**\n\nClick when you think **5.00 seconds** have passed!\n\n🎯 Target: 5.00s')
            .setFooter({ text: 'One click per player!' });

        const clickButton = new ButtonBuilder()
            .setCustomId(`timetrap_click_${session.gameId}`)
            .setLabel('⏱️ STOP!')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(clickButton);

        await interaction.update({ embeds: [embed], components: [row] });

        // Wait for all players or timeout (15 seconds max)
        const totalPlayers = session.players.length;
        const checkInterval = setInterval(async () => {
            const clicks = Object.keys(session.gameData.clicks).length;
            if (clicks >= totalPlayers || Date.now() - session.gameData.startTime > 15000) {
                clearInterval(checkInterval);
                await this.finishTimeTrap(interaction.message, session);
            }
        }, 500);
    }

    async handleTimeTrapClick(interaction, session) {
        const odUserId = interaction.user.id;
        
        // Check if already clicked
        if (session.gameData.clicks[odUserId]) {
            return interaction.reply({ content: 'You already clicked!', ephemeral: true });
        }

        // Check if player is in game
        if (!session.players.some(p => p.odUserId === odUserId)) {
            return interaction.reply({ content: 'You\'re not in this game!', ephemeral: true });
        }

        const clickTime = Date.now() - session.gameData.startTime;
        session.gameData.clicks[odUserId] = clickTime;
        this.activeSessions.set(session.gameId, session);

        await interaction.reply({ 
            content: `⏱️ You clicked at **${(clickTime / 1000).toFixed(2)}s**!`, 
            ephemeral: true 
        });
    }

    async finishTimeTrap(message, session) {
        session.state = 'finished';
        this.activeSessions.delete(session.gameId);

        const target = session.gameData.targetTime;
        const results = [];

        for (const [odUserId, clickTime] of Object.entries(session.gameData.clicks)) {
            const player = session.players.find(p => p.odUserId === odUserId);
            const diff = Math.abs(clickTime - target);
            results.push({
                odUserId,
                username: player?.username || 'Unknown',
                clickTime,
                diff
            });
        }

        // Sort by closest to target
        results.sort((a, b) => a.diff - b.diff);

        let resultText = '';
        results.forEach((r, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            const time = (r.clickTime / 1000).toFixed(2);
            const diff = r.diff === 0 ? '**PERFECT!**' : `(${r.diff > 0 ? '+' : ''}${(r.diff / 1000).toFixed(2)}s)`;
            resultText += `${medal} **${r.username}** - ${time}s ${diff}\n`;
        });

        const winner = results[0];
        const isPerfect = winner && winner.diff === 0;

        const embed = new EmbedBuilder()
            .setColor(isPerfect ? 0xFFD700 : 0x2ECC71)
            .setTitle('⏱️ Time Trap - Results')
            .setDescription(`🎯 Target: **5.00s**\n\n${resultText || 'No clicks recorded!'}`)
            .addFields({ name: 'Barry says:', value: isPerfect ? 'Did you... actually just do that?' : this.getComment('win') })
            .setTimestamp();

        await message.edit({ embeds: [embed], components: [] });

        // Save results and check achievements
        if (winner) {
            await this.saveGameResult(session, winner.odUserId, winner.username, winner.diff, true);
            if (isPerfect) await this.grantAchievement(session.guildId, winner.odUserId, 'perfect_timing');
        }
    }

    // ===========================================
    // GAME 5: WORD HEIST
    // ===========================================

    async startWordHeist(interaction, maxPlayers = 6) {
        const gameId = this.generateGameId();
        
        const categories = [
            'Animals', 'Countries', 'Foods', 'Movies', 'Sports',
            'Colors', 'Professions', 'Video Games', 'Music Artists', 'Fruits'
        ];

        const session = {
            gameId,
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
            hostId: interaction.user.id,
            type: 'wordheist',
            players: [{ odUserId: interaction.user.id, username: interaction.user.username, ready: true, words: 0 }],
            state: 'waiting',
            maxPlayers,
            minPlayers: 1,
            round: 0,
            gameData: { 
                category: categories[Math.floor(Math.random() * categories.length)],
                words: [],
                currentTurn: 0,
                turnTimeLimit: 15000
            }
        };

        this.activeSessions.set(gameId, session);

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('📚 Word Heist')
            .setDescription(`${this.getComment('gameStart')}\n\n**Category:** ${session.gameData.category}\n\n**Players:** 1/${maxPlayers}\n• ${interaction.user.username}`)
            .addFields({ name: 'How to Play', value: 'Take turns adding words to the category.\nNo repeats! One mistake ends it all.' })
            .setFooter({ text: `Game ID: ${gameId}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`game_join_${gameId}`).setLabel('Join Game').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`game_start_${gameId}`).setLabel('Start').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`game_cancel_${gameId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        session.messageId = message.id;
        await GameSession.create(session);

        return session;
    }

    // ===========================================
    // GAME 6: CHAOS VOTE
    // ===========================================

    async startChaosVote(interaction, maxPlayers = 10) {
        const gameId = this.generateGameId();
        
        const questions = [
            "Who would survive a zombie apocalypse?",
            "Who would be the worst at keeping a secret?",
            "Who's most likely to become famous?",
            "Who would win in a fight?",
            "Who's the biggest snack hoarder?",
            "Who would forget their own birthday?",
            "Who's the biggest drama queen?",
            "Who would accidentally start a cult?"
        ];

        const session = {
            gameId,
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
            hostId: interaction.user.id,
            type: 'chaosvote',
            players: [{ odUserId: interaction.user.id, username: interaction.user.username, ready: true, votes: 0 }],
            state: 'waiting',
            maxPlayers,
            minPlayers: 3,
            round: 0,
            gameData: { 
                questions,
                currentQuestion: questions[Math.floor(Math.random() * questions.length)],
                votes: {}
            }
        };

        this.activeSessions.set(gameId, session);

        const embed = new EmbedBuilder()
            .setColor(0xE91E63)
            .setTitle('🗳️ Chaos Vote')
            .setDescription(`${this.getComment('gameStart')}\n\n**Players:** 1/${maxPlayers} (min 3)\n• ${interaction.user.username}`)
            .addFields({ name: 'How to Play', value: 'Vote for who fits the question best.\nMost votes wins... or loses?' })
            .setFooter({ text: `Game ID: ${gameId}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`game_join_${gameId}`).setLabel('Join Game').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`game_start_${gameId}`).setLabel('Start').setStyle(ButtonStyle.Success).setDisabled(true),
            new ButtonBuilder().setCustomId(`game_cancel_${gameId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        session.messageId = message.id;
        await GameSession.create(session);

        return session;
    }

    async runChaosVote(interaction, session) {
        session.state = 'voting';
        session.gameData.votes = {};
        this.activeSessions.set(session.gameId, session);

        const embed = new EmbedBuilder()
            .setColor(0xE91E63)
            .setTitle('🗳️ Chaos Vote')
            .setDescription(`**${session.gameData.currentQuestion}**\n\nVote for a player!`)
            .setFooter({ text: 'Voting ends in 30 seconds' });

        // Create vote buttons for each player
        const voteButtons = session.players.slice(0, 5).map(p => 
            new ButtonBuilder()
                .setCustomId(`chaosvote_${session.gameId}_${p.odUserId}`)
                .setLabel(p.username)
                .setStyle(ButtonStyle.Secondary)
        );

        const rows = [];
        for (let i = 0; i < voteButtons.length; i += 5) {
            rows.push(new ActionRowBuilder().addComponents(voteButtons.slice(i, i + 5)));
        }

        await interaction.update({ embeds: [embed], components: rows });

        // Wait 30 seconds then show results
        setTimeout(() => this.finishChaosVote(interaction.message, session), 30000);
    }

    async finishChaosVote(message, session) {
        if (session.state !== 'voting') return;
        
        session.state = 'finished';
        this.activeSessions.delete(session.gameId);

        // Count votes
        const voteCounts = {};
        for (const [voterId, votedFor] of Object.entries(session.gameData.votes)) {
            voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
        }

        // Find winner
        let maxVotes = 0;
        let winner = null;
        for (const [odUserId, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                winner = odUserId;
            }
        }

        const winnerPlayer = session.players.find(p => p.odUserId === winner);
        const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);

        // Build results
        let resultsText = '';
        const sortedResults = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
        sortedResults.forEach(([odUserId, count]) => {
            const player = session.players.find(p => p.odUserId === odUserId);
            const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const bar = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));
            resultsText += `**${player?.username}**: ${bar} ${percent}% (${count})\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0xE91E63)
            .setTitle('🗳️ Chaos Vote - Results')
            .setDescription(`**${session.gameData.currentQuestion}**\n\n${resultsText || 'No votes cast!'}\n\n${winnerPlayer ? `👑 **${winnerPlayer.username}** wins with ${maxVotes} votes!` : 'No winner!'}`)
            .addFields({ name: 'Barry says:', value: winnerPlayer ? `Congratulations... I think? 🤔` : 'Nobody voted? Really?' })
            .setTimestamp();

        await message.edit({ embeds: [embed], components: [] });

        if (winner) {
            await this.saveGameResult(session, winner, winnerPlayer?.username, maxVotes, true);
        }
    }

    // ===========================================
    // GAME 7: BUTTON PANIC
    // ===========================================

    async startButtonPanic(interaction, maxPlayers = 10) {
        const gameId = this.generateGameId();
        
        const session = {
            gameId,
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
            hostId: interaction.user.id,
            type: 'buttonpanic',
            players: [{ odUserId: interaction.user.id, username: interaction.user.username, ready: true, failed: false }],
            state: 'waiting',
            maxPlayers,
            minPlayers: 1,
            round: 0,
            gameData: { 
                safeButton: null,
                clickedFake: {}
            }
        };

        this.activeSessions.set(gameId, session);

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('🚨 Button Panic')
            .setDescription(`${this.getComment('gameStart')}\n\n**Players:** 1/${maxPlayers}\n• ${interaction.user.username}`)
            .addFields({ name: 'How to Play', value: '**DON\'T CLICK** the fake buttons!\nOnly ONE button is safe - find it!' })
            .setFooter({ text: `Game ID: ${gameId}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`game_join_${gameId}`).setLabel('Join Game').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`game_start_${gameId}`).setLabel('Start').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`game_cancel_${gameId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        session.messageId = message.id;
        await GameSession.create(session);

        return session;
    }

    async runButtonPanic(interaction, session) {
        session.state = 'active';
        session.round++;
        session.gameData.clickedFake = {};
        
        // Randomly pick safe button (0-4)
        session.gameData.safeButton = Math.floor(Math.random() * 5);
        this.activeSessions.set(session.gameId, session);

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('🚨 Button Panic')
            .setDescription(`**⚠️ DON\'T CLICK!**\n\nOnly ONE button is safe.\nThe rest will eliminate you!`)
            .setFooter({ text: `Round ${session.round} • Choose wisely!` });

        const buttons = [];
        for (let i = 0; i < 5; i++) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`panic_${session.gameId}_${i}`)
                    .setLabel('❓')
                    .setStyle(ButtonStyle.Danger)
            );
        }

        const row = new ActionRowBuilder().addComponents(buttons);

        await interaction.update({ embeds: [embed], components: [row] });

        // Auto-reveal after 10 seconds
        setTimeout(() => this.revealButtonPanic(interaction.message, session), 10000);
    }

    async handleButtonPanicClick(interaction, session, buttonIndex) {
        const odUserId = interaction.user.id;
        
        if (!session.players.some(p => p.odUserId === odUserId)) {
            return interaction.reply({ content: 'You\'re not in this game!', ephemeral: true });
        }

        const isSafe = buttonIndex === session.gameData.safeButton;

        if (isSafe) {
            await interaction.reply({ content: '✅ **SAFE!** You found the right button!', ephemeral: true });
        } else {
            session.gameData.clickedFake[odUserId] = true;
            const player = session.players.find(p => p.odUserId === odUserId);
            if (player) player.failed = true;
            this.activeSessions.set(session.gameId, session);
            
            await this.grantAchievement(session.guildId, odUserId, 'impulse_control');
            await interaction.reply({ content: '💀 **ELIMINATED!** That was a trap button!', ephemeral: true });
        }
    }

    async revealButtonPanic(message, session) {
        session.state = 'finished';
        this.activeSessions.delete(session.gameId);

        const safeIdx = session.gameData.safeButton;
        const survivors = session.players.filter(p => !session.gameData.clickedFake[p.odUserId]);
        const eliminated = session.players.filter(p => session.gameData.clickedFake[p.odUserId]);

        let buttonDisplay = '';
        for (let i = 0; i < 5; i++) {
            buttonDisplay += i === safeIdx ? '✅' : '💀';
            buttonDisplay += ' ';
        }

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('🚨 Button Panic - Revealed!')
            .setDescription(`The safe button was: ${buttonDisplay}\n\n**Survivors:** ${survivors.map(p => p.username).join(', ') || 'None!'}\n**Eliminated:** ${eliminated.map(p => p.username).join(', ') || 'None!'}`)
            .addFields({ name: 'Barry says:', value: eliminated.length > 0 ? 'Some of you have no self-control.' : 'Impressive patience.' })
            .setTimestamp();

        await message.edit({ embeds: [embed], components: [] });
    }

    // ===========================================
    // GAME 8: DUEL DRAW
    // ===========================================

    async startDuelDraw(interaction, opponent) {
        const gameId = this.generateGameId();
        
        const session = {
            gameId,
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
            hostId: interaction.user.id,
            type: 'dueldraw',
            players: [
                { odUserId: interaction.user.id, username: interaction.user.username, ready: true },
                { odUserId: opponent.id, username: opponent.username, ready: false }
            ],
            state: 'waiting',
            maxPlayers: 2,
            minPlayers: 2,
            gameData: { 
                clicks: {},
                startTime: null
            }
        };

        this.activeSessions.set(gameId, session);

        const embed = new EmbedBuilder()
            .setColor(0x8B4513)
            .setTitle('🤠 Duel Draw')
            .setDescription(`**${interaction.user.username}** challenges **${opponent.username}**!\n\n*The sun beats down. Tumbleweeds roll by...*`)
            .addFields({ name: 'Rules', value: 'When Barry yells "DRAW!", click as fast as you can!\nFastest draw wins.' })
            .setFooter({ text: `Game ID: ${gameId}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`duel_accept_${gameId}`).setLabel('Accept Challenge').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`game_cancel_${gameId}`).setLabel('Decline').setStyle(ButtonStyle.Danger)
        );

        const message = await interaction.reply({ 
            content: `${opponent}`, 
            embeds: [embed], 
            components: [row], 
            fetchReply: true 
        });
        session.messageId = message.id;
        await GameSession.create(session);

        return session;
    }

    async runDuelDraw(interaction, session) {
        session.state = 'starting';
        this.activeSessions.set(session.gameId, session);

        const p1 = session.players[0];
        const p2 = session.players[1];

        // Countdown
        const countdownEmbed = new EmbedBuilder()
            .setColor(0x8B4513)
            .setTitle('🤠 Duel Draw')
            .setDescription(`**${p1.username}** vs **${p2.username}**\n\n🔫 *Hands hover over holsters...*`)
            .setFooter({ text: 'Wait for it...' });

        await interaction.update({ embeds: [countdownEmbed], components: [] });

        // Random delay 2-5 seconds
        const delay = Math.floor(Math.random() * 3000) + 2000;
        await new Promise(resolve => setTimeout(resolve, delay));

        if (!this.activeSessions.has(session.gameId)) return;

        session.state = 'active';
        session.gameData.startTime = Date.now();
        session.gameData.clicks = {};
        this.activeSessions.set(session.gameId, session);

        const drawEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🤠 DRAW!')
            .setDescription('⚡ **CLICK NOW!** ⚡')
            .setTimestamp();

        const drawButton = new ButtonBuilder()
            .setCustomId(`duel_draw_${session.gameId}`)
            .setLabel('🔫 DRAW!')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(drawButton);

        await interaction.message.edit({ embeds: [drawEmbed], components: [row] });
    }

    async handleDuelClick(interaction, session) {
        const odUserId = interaction.user.id;
        
        if (!session.players.some(p => p.odUserId === odUserId)) {
            return interaction.reply({ content: 'This isn\'t your duel!', ephemeral: true });
        }

        if (session.gameData.clicks[odUserId]) {
            return interaction.reply({ content: 'You already drew!', ephemeral: true });
        }

        const drawTime = Date.now() - session.gameData.startTime;
        session.gameData.clicks[odUserId] = drawTime;
        this.activeSessions.set(session.gameId, session);

        // Check if both players clicked
        if (Object.keys(session.gameData.clicks).length >= 2) {
            await this.finishDuel(interaction, session);
        } else {
            await interaction.reply({ content: `🔫 You drew in **${drawTime}ms**! Waiting for opponent...`, ephemeral: true });
        }
    }

    async finishDuel(interaction, session) {
        session.state = 'finished';
        this.activeSessions.delete(session.gameId);

        const clicks = session.gameData.clicks;
        const p1 = session.players[0];
        const p2 = session.players[1];

        const p1Time = clicks[p1.odUserId] || 99999;
        const p2Time = clicks[p2.odUserId] || 99999;

        let winner, loser, winTime, loseTime;
        if (p1Time < p2Time) {
            winner = p1; loser = p2; winTime = p1Time; loseTime = p2Time;
        } else {
            winner = p2; loser = p1; winTime = p2Time; loseTime = p1Time;
        }

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🤠 Duel Draw - Winner!')
            .setDescription(`**${winner.username}** wins!\n\n⚡ ${winner.username}: **${winTime}ms**\n💀 ${loser.username}: **${loseTime}ms**\n\nDifference: ${Math.abs(p1Time - p2Time)}ms`)
            .addFields({ name: 'Barry says:', value: Math.abs(p1Time - p2Time) < 50 ? 'That was close as hell.' : `${loser.username} never stood a chance.` })
            .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });

        await this.saveGameResult(session, winner.odUserId, winner.username, winTime, true);
        if (winTime < 100) await this.grantAchievement(session.guildId, winner.odUserId, 'quick_draw');
    }

    // ===========================================
    // GAME 9: LOGIC GRID (Simplified)
    // ===========================================

    async startLogicGrid(interaction, maxPlayers = 4) {
        const gameId = this.generateGameId();
        
        // Simple 3x3 puzzle
        const puzzle = this.generateLogicPuzzle();

        const session = {
            gameId,
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
            hostId: interaction.user.id,
            type: 'logicgrid',
            players: [{ odUserId: interaction.user.id, username: interaction.user.username, ready: true }],
            state: 'waiting',
            maxPlayers,
            minPlayers: 1,
            gameData: puzzle
        };

        this.activeSessions.set(gameId, session);

        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('🧩 Logic Grid')
            .setDescription(`${this.getComment('gameStart')}\n\n**Players:** 1/${maxPlayers}\n• ${interaction.user.username}`)
            .addFields({ name: 'How to Play', value: 'Work together to solve the logic puzzle!\nBarry will give hints, not answers.' })
            .setFooter({ text: `Game ID: ${gameId}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`game_join_${gameId}`).setLabel('Join Game').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`game_start_${gameId}`).setLabel('Start').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`game_cancel_${gameId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        session.messageId = message.id;
        await GameSession.create(session);

        return session;
    }

    generateLogicPuzzle() {
        // Simple number sequence puzzle
        const start = Math.floor(Math.random() * 10) + 1;
        const step = Math.floor(Math.random() * 5) + 2;
        const sequence = [start, start + step, start + step * 2];
        const answer = start + step * 3;
        
        return {
            type: 'sequence',
            sequence,
            answer,
            hints: [
                'Look for a pattern in the numbers.',
                `The difference between numbers is constant.`,
                `Try adding ${step} to the last number.`
            ],
            hintsGiven: 0
        };
    }

    async runLogicGrid(interaction, session) {
        session.state = 'active';
        session.gameData.startTime = Date.now();
        this.activeSessions.set(session.gameId, session);

        const puzzle = session.gameData;
        const sequenceDisplay = puzzle.sequence.join(' → ') + ' → ?';

        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('🧩 Logic Grid - Sequence Puzzle')
            .setDescription(`**Find the next number in the sequence:**\n\n\`${sequenceDisplay}\``)
            .addFields(
                { name: 'Instructions', value: 'Click a number button to submit your answer!' },
                { name: 'Hints Available', value: `${3 - puzzle.hintsGiven} remaining`, inline: true }
            )
            .setFooter({ text: `Game ID: ${session.gameId}` });

        // Generate answer options (including correct answer and 3 wrong ones)
        const options = this.generateLogicOptions(puzzle.answer);
        
        const row1 = new ActionRowBuilder().addComponents(
            options.slice(0, 4).map((num, i) => 
                new ButtonBuilder()
                    .setCustomId(`logicgrid_answer_${session.gameId}_${num}`)
                    .setLabel(`${num}`)
                    .setStyle(ButtonStyle.Primary)
            )
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`logicgrid_hint_${session.gameId}`)
                .setLabel('💡 Get Hint')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(puzzle.hintsGiven >= 3),
            new ButtonBuilder()
                .setCustomId(`game_cancel_${session.gameId}`)
                .setLabel('Give Up')
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.update({ embeds: [embed], components: [row1, row2] });
    }

    generateLogicOptions(correctAnswer) {
        const options = [correctAnswer];
        while (options.length < 4) {
            const offset = Math.floor(Math.random() * 10) - 5;
            const wrongAnswer = correctAnswer + offset;
            if (wrongAnswer !== correctAnswer && wrongAnswer > 0 && !options.includes(wrongAnswer)) {
                options.push(wrongAnswer);
            }
        }
        // Shuffle
        return options.sort(() => Math.random() - 0.5);
    }

    async handleLogicGridAnswer(interaction, session, answer) {
        const puzzle = session.gameData;
        const isCorrect = parseInt(answer) === puzzle.answer;
        const timeTaken = Date.now() - puzzle.startTime;

        this.activeSessions.delete(session.gameId);
        await GameSession.deleteOne({ gameId: session.gameId });

        const color = isCorrect ? 0x2ECC71 : 0xE74C3C;
        const title = isCorrect ? '🧩 Logic Grid - Solved!' : '🧩 Logic Grid - Wrong Answer!';
        
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(isCorrect 
                ? `${this.getComment('gameEnd')}\n\n✅ **Correct!** The answer was **${puzzle.answer}**`
                : `❌ The correct answer was **${puzzle.answer}**\n\nSequence: ${puzzle.sequence.join(' → ')} → **${puzzle.answer}**`)
            .addFields(
                { name: 'Time', value: `${(timeTaken / 1000).toFixed(2)}s`, inline: true },
                { name: 'Hints Used', value: `${puzzle.hintsGiven}`, inline: true }
            )
            .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });

        // Save result
        const score = isCorrect ? Math.max(100 - puzzle.hintsGiven * 20, 20) : 0;
        for (const player of session.players) {
            await this.saveGameResult(session, player.odUserId, player.username, score, isCorrect);
        }

        await this.postToGameResults(interaction.guild, embed);
    }

    async handleLogicGridHint(interaction, session) {
        const puzzle = session.gameData;
        
        if (puzzle.hintsGiven >= 3) {
            return interaction.reply({ content: 'No more hints available!', ephemeral: true });
        }

        const hint = puzzle.hints[puzzle.hintsGiven];
        puzzle.hintsGiven++;
        this.activeSessions.set(session.gameId, session);

        const sequenceDisplay = puzzle.sequence.join(' → ') + ' → ?';
        const options = this.generateLogicOptions(puzzle.answer);

        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('🧩 Logic Grid - Sequence Puzzle')
            .setDescription(`**Find the next number in the sequence:**\n\n\`${sequenceDisplay}\``)
            .addFields(
                { name: '💡 Hint', value: hint },
                { name: 'Hints Available', value: `${3 - puzzle.hintsGiven} remaining`, inline: true }
            )
            .setFooter({ text: `Game ID: ${session.gameId}` });

        const row1 = new ActionRowBuilder().addComponents(
            options.slice(0, 4).map((num, i) => 
                new ButtonBuilder()
                    .setCustomId(`logicgrid_answer_${session.gameId}_${num}`)
                    .setLabel(`${num}`)
                    .setStyle(ButtonStyle.Primary)
            )
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`logicgrid_hint_${session.gameId}`)
                .setLabel('💡 Get Hint')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(puzzle.hintsGiven >= 3),
            new ButtonBuilder()
                .setCustomId(`game_cancel_${session.gameId}`)
                .setLabel('Give Up')
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.update({ embeds: [embed], components: [row1, row2] });
    }

    // ===========================================
    // GAME 10: DAILY CHALLENGE
    // ===========================================

    async startDailyChallenge(interaction) {
        const today = new Date().toISOString().split('T')[0];
        const guildId = interaction.guild.id;
        const odUserId = interaction.user.id;

        // Check if already played today (per user per guild)
        const existingResult = await DailyResult.findOne({ date: today, guildId, odUserId });
        if (existingResult) {
            return interaction.reply({ 
                content: `⏰ You've already completed today's challenge! Your score: **${existingResult.score}ms**\n\nCome back tomorrow for a new challenge.`, 
                ephemeral: true 
            });
        }

        // Get or create today's challenge
        let challenge = await DailyChallenge.findOne({ date: today });
        if (!challenge) {
            const gameTypes = ['reflex', 'timetrap', 'memory'];
            challenge = await DailyChallenge.create({
                date: today,
                gameType: gameTypes[Math.floor(Math.random() * gameTypes.length)],
                config: { difficulty: 'normal' },
                participants: 0
            });
        }

        // Route to appropriate game
        switch (challenge.gameType) {
            case 'reflex':
                return this.runDailyReflex(interaction, challenge);
            case 'timetrap':
                return this.runDailyTimeTrap(interaction, challenge);
            default:
                return this.runDailyReflex(interaction, challenge);
        }
    }

    async runDailyReflex(interaction, challenge) {
        const embed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle('📅 Daily Challenge - Reaction Test')
            .setDescription('🔴 **GET READY...**\n\nWait for the GREEN button!')
            .setFooter({ text: `Daily Challenge • ${challenge.date}` });

        // Use fetchReply to get the message for later editing
        const msg = await interaction.reply({ embeds: [embed], components: [], fetchReply: true });

        const delay = Math.floor(Math.random() * 4000) + 2000;
        await new Promise(resolve => setTimeout(resolve, delay));

        const startTime = Date.now();

        const goEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('📅 Daily Challenge')
            .setDescription('🟢 **HIT NOW!**');

        const hitButton = new ButtonBuilder()
            .setCustomId(`daily_hit_${Date.now()}`) // Unique ID each time
            .setLabel('🎯 HIT!')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(hitButton);

        await interaction.editReply({ embeds: [goEmbed], components: [row] });

        // Create collector on the message
        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 10000,
            max: 1,
            componentType: ComponentType.Button
        });

        collector.on('collect', async (i) => {
            const reactionTime = Date.now() - startTime;
            
            try {
                // Save daily score
                await DailyChallenge.updateOne(
                    { date: challenge.date },
                    { 
                        $inc: { participants: 1 },
                        $min: { topScore: reactionTime },
                        ...(reactionTime < (challenge.topScore || Infinity) ? { topUserId: interaction.user.id } : {})
                    }
                );

                await this.saveDailyResult(interaction.guild.id, interaction.user.id, challenge.date, reactionTime);

                const resultEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('📅 Daily Challenge - Complete!')
                    .setDescription(`⏱️ Your time: **${reactionTime}ms**\n\n${reactionTime < 250 ? '⭐ Excellent!' : reactionTime < 400 ? '👍 Good!' : '👌 Decent'}`)
                    .addFields({ name: 'Daily Streak', value: 'Check back tomorrow to keep your streak!' })
                    .setTimestamp();

                await i.update({ embeds: [resultEmbed], components: [] });

                // Check daily streak achievement
                await this.checkDailyStreak(interaction.guild.id, interaction.user.id);
            } catch (err) {
                console.error('Daily challenge error:', err);
                try {
                    await i.update({ content: 'Something went wrong saving your score!', embeds: [], components: [] });
                } catch {}
            }
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xE74C3C)
                    .setTitle('📅 Daily Challenge - Timeout')
                    .setDescription('⏰ Too slow! Try again tomorrow.');

                try {
                    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                } catch {}
            }
        });
    }

    async runDailyTimeTrap(interaction, challenge) {
        const embed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle('📅 Daily Challenge - Time Trap')
            .setDescription('⏳ **Timer starting...**\n\nClick when you think **5.00 seconds** have passed!')
            .setFooter({ text: `Daily Challenge • ${challenge.date}` });

        const clickButton = new ButtonBuilder()
            .setCustomId(`daily_timetrap_${challenge.date}`)
            .setLabel('⏱️ STOP!')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(clickButton);
        const startTime = Date.now();

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        try {
            const collected = await message.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id,
                time: 15000,
                componentType: ComponentType.Button
            });

            const clickTime = Date.now() - startTime;
            const diff = Math.abs(clickTime - 5000);

            await DailyChallenge.updateOne(
                { date: challenge.date },
                { 
                    $inc: { participants: 1 },
                    $min: { topScore: diff }
                }
            );

            await this.saveDailyResult(interaction.guild.id, interaction.user.id, challenge.date, diff);

            const resultEmbed = new EmbedBuilder()
                .setColor(diff < 100 ? 0x2ECC71 : 0x3498DB)
                .setTitle('📅 Daily Challenge - Complete!')
                .setDescription(`⏱️ You clicked at: **${(clickTime / 1000).toFixed(2)}s**\n🎯 Target: **5.00s**\n📊 Accuracy: **${diff}ms** off`)
                .setTimestamp();

            await collected.update({ embeds: [resultEmbed], components: [] });

        } catch {
            await interaction.editReply({ 
                embeds: [embed.setDescription('⏰ Time\'s up!')], 
                components: [] 
            });
        }
    }

    // ===========================================
    // UTILITY METHODS
    // ===========================================

    async handleJoinGame(interaction, gameId) {
        const session = this.activeSessions.get(gameId);
        if (!session) {
            return interaction.reply({ content: 'Game not found or already ended.', ephemeral: true });
        }

        if (session.state !== 'waiting') {
            return interaction.reply({ content: 'Game already started!', ephemeral: true });
        }

        if (session.players.some(p => p.odUserId === interaction.user.id)) {
            return interaction.reply({ content: 'You\'re already in this game!', ephemeral: true });
        }

        if (session.players.length >= session.maxPlayers) {
            return interaction.reply({ content: 'Game is full!', ephemeral: true });
        }

        session.players.push({
            odUserId: interaction.user.id,
            username: interaction.user.username,
            ready: true,
            score: 0
        });
        this.activeSessions.set(gameId, session);

        // Update embed with new player list
        const playerList = session.players.map(p => `• ${p.username}`).join('\n');
        const oldEmbed = interaction.message.embeds[0];
        const oldDesc = oldEmbed?.description || '';
        const newDesc = oldDesc.replace(/\*\*Players:\*\*[\s\S]*$/m, `**Players:** ${session.players.length}/${session.maxPlayers}\n${playerList}`);
        
        const embed = new EmbedBuilder()
            .setColor(oldEmbed?.color || 0x5865F2)
            .setTitle(oldEmbed?.title || 'Game')
            .setDescription(newDesc)
            .setFooter(oldEmbed?.footer || null);

        if (oldEmbed?.fields?.length > 0) {
            embed.addFields(oldEmbed.fields);
        }

        // Enable start button if minimum players reached
        const components = interaction.message.components.map(row => {
            const newRow = ActionRowBuilder.from(row);
            newRow.components = row.components.map(button => {
                if (button.customId?.includes('game_start')) {
                    return ButtonBuilder.from(button).setDisabled(session.players.length < session.minPlayers);
                }
                return ButtonBuilder.from(button);
            });
            return newRow;
        });

        await interaction.update({ embeds: [embed], components });
    }

    async handleStartGame(interaction, gameId) {
        const session = this.activeSessions.get(gameId);
        if (!session) {
            return interaction.reply({ content: 'Game not found.', ephemeral: true });
        }

        if (interaction.user.id !== session.hostId) {
            return interaction.reply({ content: 'Only the host can start the game!', ephemeral: true });
        }

        if (session.players.length < session.minPlayers) {
            return interaction.reply({ content: `Need at least ${session.minPlayers} players!`, ephemeral: true });
        }

        // Route to game-specific start
        switch (session.type) {
            case 'reflex': return this.runReflexGame(interaction, session);
            case 'mindlock': return this.runMindLockRound(interaction, session);
            case 'timetrap': return this.runTimeTrap(interaction, session);
            case 'chaosvote': return this.runChaosVote(interaction, session);
            case 'buttonpanic': return this.runButtonPanic(interaction, session);
            case 'dueldraw': return this.runDuelDraw(interaction, session);
            case 'logicgrid': return this.runLogicGrid(interaction, session);
            default: return interaction.reply({ content: 'Unknown game type.', ephemeral: true });
        }
    }

    async handleCancelGame(interaction, gameId) {
        const session = this.activeSessions.get(gameId);
        if (!session) {
            return interaction.reply({ content: 'Game not found.', ephemeral: true });
        }

        if (interaction.user.id !== session.hostId) {
            return interaction.reply({ content: 'Only the host can cancel!', ephemeral: true });
        }

        this.activeSessions.delete(gameId);
        await GameSession.updateOne({ gameId }, { state: 'cancelled' });

        const embed = new EmbedBuilder()
            .setColor(0x95A5A6)
            .setTitle('Game Cancelled')
            .setDescription('The host cancelled the game.')
            .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });
    }

    async saveGameResult(session, odUserId, username, score, isWinner) {
        // Save individual result
        await GameResult.create({
            guildId: session.guildId,
            gameId: session.gameId,
            gameType: session.type,
            odUserId,
            username,
            score,
            isWinner,
            timestamp: new Date()
        });

        // Update user stats
        await UserGameStats.findOneAndUpdate(
            { guildId: session.guildId, odUserId },
            {
                $inc: {
                    totalGamesPlayed: 1,
                    totalWins: isWinner ? 1 : 0,
                    [`gameStats.${session.type}.played`]: 1,
                    [`gameStats.${session.type}.wins`]: isWinner ? 1 : 0
                },
                $set: { updatedAt: new Date() }
            },
            { upsert: true }
        );

        // Update leaderboard
        await this.updateLeaderboard(session.guildId, odUserId, username, session.type, score, isWinner);
    }

    async saveDailyResult(guildId, odUserId, date, score) {
        // Save to DailyResult to track completion (prevents replay)
        await DailyResult.findOneAndUpdate(
            { date, guildId, odUserId },
            { $set: { score, completedAt: new Date() } },
            { upsert: true }
        );
        
        // Also save to GameResult for stats
        await GameResult.create({
            guildId,
            gameId: `daily-${date}`,
            gameType: 'daily',
            odUserId,
            score,
            isWinner: false,
            timestamp: new Date()
        });
    }

    async updateLeaderboard(guildId, odUserId, username, gameType, score, isWinner) {
        const today = new Date();
        const periodKey = today.toISOString().split('T')[0];
        const weekKey = `${today.getFullYear()}-W${Math.ceil(today.getDate() / 7)}`;

        // Update daily leaderboard
        await LeaderboardEntry.findOneAndUpdate(
            { guildId, odUserId, gameType, period: 'daily', periodKey },
            {
                $set: { username, updatedAt: new Date() },
                $inc: { gamesPlayed: 1, wins: isWinner ? 1 : 0 },
                $min: { bestScore: score }
            },
            { upsert: true }
        );

        // Update all-time leaderboard
        await LeaderboardEntry.findOneAndUpdate(
            { guildId, odUserId, gameType, period: 'alltime' },
            {
                $set: { username, updatedAt: new Date() },
                $inc: { gamesPlayed: 1, wins: isWinner ? 1 : 0 },
                $min: { bestScore: score }
            },
            { upsert: true }
        );
    }

    async grantAchievement(guildId, odUserId, achievementId) {
        // Check if already has achievement
        const existing = await UserAchievement.findOne({ guildId, odUserId, achievementId });
        if (existing) return null;

        // Grant achievement
        const achievement = this.achievements.find(a => a.achievementId === achievementId);
        if (!achievement) return null;

        await UserAchievement.create({
            guildId,
            odUserId,
            achievementId,
            unlockedAt: new Date()
        });

        return achievement;
    }

    async checkDailyStreak(guildId, odUserId) {
        const stats = await UserGameStats.findOne({ guildId, odUserId });
        if (!stats) return;

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (stats.lastDailyPlayed === yesterday) {
            // Continue streak
            await UserGameStats.updateOne(
                { guildId, odUserId },
                { 
                    $inc: { dailyChallengeStreak: 1 },
                    $set: { lastDailyPlayed: today }
                }
            );

            const newStreak = (stats.dailyChallengeStreak || 0) + 1;
            if (newStreak >= 7) {
                await this.grantAchievement(guildId, odUserId, 'daily_grinder');
            }
        } else if (stats.lastDailyPlayed !== today) {
            // Reset streak
            await UserGameStats.updateOne(
                { guildId, odUserId },
                { 
                    $set: { dailyChallengeStreak: 1, lastDailyPlayed: today }
                }
            );
        }
    }

    async getLeaderboard(guildId, gameType, period = 'alltime', limit = 10) {
        return LeaderboardEntry.find({ guildId, gameType, period })
            .sort({ wins: -1, bestScore: 1 })
            .limit(limit);
    }

    async getUserStats(guildId, odUserId) {
        // Try with odUserId first (new format)
        let stats = await UserGameStats.findOne({ guildId, odUserId });
        // Fallback to userId for backward compatibility
        if (!stats) {
            stats = await UserGameStats.findOne({ guildId, userId: odUserId });
        }
        return stats;
    }

    async getUserAchievements(guildId, odUserId) {
        // Try both field names for compatibility
        let userAchs = await UserAchievement.find({ guildId, odUserId });
        if (!userAchs || userAchs.length === 0) {
            userAchs = await UserAchievement.find({ guildId, userId: odUserId });
        }
        return userAchs.map(ua => {
            const ach = this.achievements.find(a => a.achievementId === ua.achievementId);
            return { ...ach, unlockedAt: ua.unlockedAt };
        });
    }

    async postToGameResults(guild, embed) {
        const resultsChannel = guild.channels.cache.find(
            ch => ch.name === 'game-results' || ch.name === 'games-results'
        );
        if (resultsChannel) {
            await resultsChannel.send({ embeds: [embed] }).catch(() => {});
        }
    }
}

module.exports = GameHandler;
