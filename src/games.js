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

    /**
     * Create a beautiful winner announcement embed
     */
    createWinnerEmbed(gameType, winner, stats = {}) {
        const gameInfo = {
            reflex: { name: 'Reflex Roulette', icon: '⚡', color: 0x5865F2 },
            mindlock: { name: 'Mind Lock', icon: '🧠', color: 0x9B59B6 },
            timetrap: { name: 'Time Trap', icon: '⏱️', color: 0x3498DB },
            bluff: { name: 'Bluff or Bust', icon: '🎭', color: 0xE74C3C },
            wordheist: { name: 'Word Heist', icon: '📚', color: 0x2ECC71 },
            chaosvote: { name: 'Chaos Vote', icon: '🗳️', color: 0xE91E63 },
            buttonpanic: { name: 'Button Panic', icon: '🚨', color: 0xE74C3C },
            dueldraw: { name: 'Duel Draw', icon: '🤠', color: 0x8B4513 },
            logicgrid: { name: 'Logic Grid', icon: '🧩', color: 0x9B59B6 }
        };

        const game = gameInfo[gameType] || { name: gameType, icon: '🎮', color: 0x5865F2 };
        
        // Celebration messages
        const celebrations = [
            '🎉 **VICTORY!** 🎉',
            '👑 **CHAMPION CROWNED!** 👑',
            '🏆 **WINNER WINNER!** 🏆',
            '⭐ **SPECTACULAR WIN!** ⭐',
            '🔥 **DOMINATION!** 🔥'
        ];
        const celebration = celebrations[Math.floor(Math.random() * celebrations.length)];

        const embed = new EmbedBuilder()
            .setColor(game.color)
            .setTitle(`${game.icon} ${game.name} - Results`)
            .setDescription(`${celebration}\n\n🥇 **${winner.username || winner}** takes the win!`)
            .setTimestamp();

        // Add stats if provided
        if (stats.score !== undefined) {
            embed.addFields({ name: '📊 Score', value: `${stats.score}`, inline: true });
        }
        if (stats.time !== undefined) {
            embed.addFields({ name: '⏱️ Time', value: `${stats.time}ms`, inline: true });
        }
        if (stats.rounds !== undefined) {
            embed.addFields({ name: '🔄 Rounds', value: `${stats.rounds}`, inline: true });
        }

        // Add Barry's comment
        embed.addFields({ 
            name: '💬 Barry says:', 
            value: this.getComment('win'),
            inline: false 
        });

        // Add CTA
        embed.setFooter({ text: '🏆 Check your rank with /rank • View all rankings with /ranks' });

        return embed;
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

        // Get player IDs for filter - store them before the async operation
        const playerIds = session.players.map(p => p.odUserId);
        const gameId = session.gameId;

        // Create collector instead of awaitMessageComponent for better reliability
        const collector = message.createMessageComponentCollector({
            filter: i => {
                // Check if button matches and user is in game
                const isCorrectButton = i.customId === `reflex_hit_${gameId}`;
                const isPlayer = playerIds.includes(i.user.id);
                return isCorrectButton && isPlayer;
            },
            time: 10000,
            max: 1,
            componentType: ComponentType.Button
        });

        collector.on('collect', async (collected) => {
            const reactionTime = Date.now() - session.gameData.startTime;
            await this.handleReflexWin(collected, session, reactionTime);
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                // Timeout - no winner
                await this.handleReflexTimeout(message, session);
            }
        });
    }

    async handleReflexWin(interaction, session, reactionTime) {
        const winner = interaction.user;
        session.state = 'finished';
        session.endedAt = new Date();
        this.activeSessions.delete(session.gameId);

        // Determine rating
        let rating, color, ratingEmoji;
        if (reactionTime < 150) { rating = 'INHUMAN!'; color = 0xFFD700; ratingEmoji = '🏆'; }
        else if (reactionTime < 200) { rating = 'Incredible!'; color = 0x9B59B6; ratingEmoji = '⚡'; }
        else if (reactionTime < 300) { rating = 'Excellent!'; color = 0x2ECC71; ratingEmoji = '⭐'; }
        else if (reactionTime < 500) { rating = 'Good!'; color = 0x3498DB; ratingEmoji = '👍'; }
        else { rating = 'Decent'; color = 0x95A5A6; ratingEmoji = '👌'; }

        // Celebration messages
        const celebrations = ['🎉 VICTORY! 🎉', '👑 CHAMPION! 👑', '🏆 WINNER! 🏆', '⭐ IMPRESSIVE! ⭐'];
        const celebration = celebrations[Math.floor(Math.random() * celebrations.length)];

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`⚡ Reflex Roulette`)
            .setDescription(`${celebration}\n\n🥇 **${winner.username}** wins!\n\n⏱️ **${reactionTime}ms** ${ratingEmoji} ${rating}`)
            .setThumbnail(winner.displayAvatarURL())
            .addFields(
                { name: '💬 Barry says:', value: this.getComment(reactionTime < 300 ? 'win' : 'close') }
            )
            .setFooter({ text: '🏆 /rank to see your ranking • /ranks for leaderboard' })
            .setTimestamp();

        // Use deferUpdate + message.edit to avoid double acknowledgment
        try {
            await interaction.deferUpdate();
        } catch (e) {
            // Interaction may already be deferred/acknowledged
        }
        try {
            await interaction.message.edit({ embeds: [embed], components: [] });
        } catch (e) {
            // Fallback: fetch channel and message
            const channel = await interaction.client.channels.fetch(session.channelId);
            const msg = await channel.messages.fetch(session.messageId);
            await msg.edit({ embeds: [embed], components: [] });
        }

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

        // Always use channel/message fetch for reliability
        try {
            const channel = interaction.channel || await interaction.client.channels.fetch(session.channelId);
            const msg = await channel.messages.fetch(session.messageId);
            await msg.edit({ embeds: [showEmbed], components: [] });
        } catch (e) {
            console.error('Mind Lock show sequence error:', e.message);
            // If we have an interaction, try to update it
            if (interaction.update) {
                try { await interaction.update({ embeds: [showEmbed], components: [] }); } catch {}
            }
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

        // Check if this player already completed their input
        if (session.gameData.completedPlayers && session.gameData.completedPlayers.includes(userId)) {
            return await interaction.reply({ content: 'You already submitted your answer! Wait for other players.', ephemeral: true });
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
            // Still inputting - show progress ONLY to this player (ephemeral)
            await interaction.reply({ 
                content: `**Your input:** ${inputStr}\n**Progress:** ${currentInput.length}/${expectedLength} - Keep going!`, 
                ephemeral: true 
            });
            this.activeSessions.set(session.gameId, session);
            return;
        }

        // Input complete - check if correct
        const correctSequence = session.gameData.sequence.join(' ');
        const isCorrect = inputStr === correctSequence;

        // Track completion
        if (!session.gameData.completedPlayers) session.gameData.completedPlayers = [];
        session.gameData.completedPlayers.push(userId);

        if (isCorrect) {
            // Award points (longer sequences = more points)
            const points = session.round * 10;
            player.score += points;

            // Notify this player of their success (ephemeral)
            await interaction.reply({ 
                content: `✅ **Correct!** +${points} points\\nYour score: ${player.score}\\n\\n*Waiting for other players...*`, 
                ephemeral: true 
            });
        } else {
            // Notify this player of their failure (ephemeral)
            await interaction.reply({ 
                content: `❌ **Wrong!** The correct sequence was: ${correctSequence}\\nYour input: ${inputStr}`, 
                ephemeral: true 
            });
        }

        this.activeSessions.set(session.gameId, session);

        // Check if all players have completed
        const allCompleted = session.players.every(p => 
            session.gameData.completedPlayers.includes(p.odUserId)
        );

        if (allCompleted) {
            // Check if any player got it wrong
            const anyWrong = session.players.some(p => {
                const pInput = session.gameData.playerInputs[p.odUserId]?.join(' ') || '';
                return pInput !== correctSequence;
            });

            if (anyWrong || session.round >= 5) {
                // Game over
                await this.endMindLock(interaction, session, !anyWrong);
            } else {
                // All correct, continue to next round
                const successEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle(`🧠 Mind Lock - Round ${session.round} Complete!`)
                    .setDescription(`✅ **All players got it right!**\\n\\n${session.players.map(p => `${p.username}: ${p.score} pts`).join('\\n')}`)
                    .setFooter({ text: 'Next round starting...' });

                try {
                    const channel = await interaction.client.channels.fetch(session.channelId);
                    const msg = await channel.messages.fetch(session.messageId);
                    await msg.edit({ embeds: [successEmbed], components: [] });
                } catch {}
                
                // Reset for next round
                session.gameData.completedPlayers = [];
                session.gameData.playerInputs = {};
                this.activeSessions.set(session.gameId, session);

                // Wait then start next round
                const channelId = session.channelId;
                const messageId = session.messageId;
                const client = interaction.client;
                
                setTimeout(async () => {
                    try {
                        if (this.activeSessions.has(session.gameId)) {
                            const channel = await client.channels.fetch(channelId);
                            const msg = await channel.messages.fetch(messageId);
                            await this.runMindLockRound({ message: msg, channel, client }, session);
                        }
                    } catch (err) {
                        console.error('Mind Lock next round error:', err.message);
                    }
                }, 2000);
            }
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
    // RUN BLUFF OR BUST GAME
    // ===========================================

    async runBluffOrBust(interaction, session) {
        session.state = 'answering';
        session.round++;
        session.gameData.answers = {};
        
        // Pick random question
        const question = session.gameData.questions[Math.floor(Math.random() * session.gameData.questions.length)];
        session.gameData.currentQuestion = question;
        
        // Pick random player to be the "bluffer" (gives fake answer)
        const blufferIndex = Math.floor(Math.random() * session.players.length);
        session.gameData.fakeAuthor = session.players[blufferIndex].odUserId;
        
        this.activeSessions.set(session.gameId, session);

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle(`🎭 Bluff or Bust - Round ${session.round}`)
            .setDescription(`**Question:** ${question}\n\n📝 *Check your DMs to submit your answer!*\n\n⚠️ **Make sure you can receive DMs from server members!**\n(Server Settings → Privacy → Allow DMs)\n\n⏰ You have 60 seconds.`)
            .addFields({ name: 'Players', value: session.players.map(p => `${p.odUserId === session.gameData.fakeAuthor ? '🎭' : '✍️'} ${p.username}`).join('\n') })
            .setFooter({ text: `Game ID: ${session.gameId}` });

        await interaction.update({ embeds: [embed], components: [] });

        // Track DM failures
        const dmFailures = [];

        // DM each player for their answer - run in parallel for speed
        const dmPromises = session.players.map(async (player) => {
            try {
                const user = await interaction.client.users.fetch(player.odUserId);
                const isBluffer = player.odUserId === session.gameData.fakeAuthor;
                
                const dmEmbed = new EmbedBuilder()
                    .setColor(isBluffer ? 0xE74C3C : 0x3498DB)
                    .setTitle(isBluffer ? '🎭 You are the BLUFFER!' : '✍️ Answer Time!')
                    .setDescription(`**Question:** ${question}\n\n${isBluffer 
                        ? '**Make up a believable LIE!** Others will try to spot it.'
                        : '**Answer truthfully.** One player is bluffing - you\'ll have to spot them!'}`)
                    .setFooter({ text: 'Reply to this message with your answer (60 seconds)' });

                let dm;
                try {
                    dm = await user.send({ embeds: [dmEmbed] });
                } catch (dmError) {
                    // DM failed - user has DMs disabled
                    console.error(`Cannot DM ${player.username}: ${dmError.message}`);
                    dmFailures.push(player.username);
                    return;
                }
                
                // Collect answer
                const filter = m => m.author.id === player.odUserId;
                try {
                    const collected = await dm.channel.awaitMessages({ filter, max: 1, time: 60000 });
                    
                    if (collected.size > 0) {
                        session.gameData.answers[player.odUserId] = {
                            answer: collected.first().content,
                            username: player.username,
                            isBluff: isBluffer
                        };
                        await user.send('✅ Answer received!');
                    } else {
                        await user.send('⏰ Time ran out! No answer submitted.');
                    }
                } catch (collectError) {
                    console.error(`Answer collection failed for ${player.username}:`, collectError.message);
                }
            } catch (err) {
                console.error(`Failed to process ${player.username}:`, err.message);
                dmFailures.push(player.username);
            }
        });

        // Wait for all DM operations to complete
        await Promise.all(dmPromises);

        this.activeSessions.set(session.gameId, session);

        // Check if we had DM failures and notify the channel
        if (dmFailures.length > 0) {
            try {
                const channel = await interaction.client.channels.fetch(session.channelId);
                await channel.send({
                    content: `⚠️ **Could not DM:** ${dmFailures.join(', ')}\n\nPlease enable DMs from server members to play this game!`,
                    allowedMentions: { users: [] }
                });
            } catch {}
        }

        // Move to voting phase
        await this.bluffVotingPhase(interaction.message, session);
    }

    async bluffVotingPhase(message, session) {
        session.state = 'voting';
        session.gameData.votes = {};
        this.activeSessions.set(session.gameId, session);

        const answers = Object.entries(session.gameData.answers);
        if (answers.length < 2) {
            // Not enough answers
            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('🎭 Bluff or Bust - Not Enough Answers!')
                .setDescription('Not enough players submitted answers. Game cancelled.')
                .setTimestamp();
            return message.edit({ embeds: [embed], components: [] });
        }

        // Shuffle answers so bluffer isn't obvious
        const shuffledAnswers = answers.sort(() => Math.random() - 0.5);
        
        let answerList = '';
        shuffledAnswers.forEach(([odUserId, data], i) => {
            answerList += `**${i + 1}.** "${data.answer}" - *${data.username}*\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle('🎭 Bluff or Bust - Who\'s the BLUFFER?')
            .setDescription(`**Question:** ${session.gameData.currentQuestion}\n\n**Answers:**\n${answerList}\n\n🔍 Vote for who you think is BLUFFING!`)
            .setFooter({ text: 'Voting ends in 30 seconds' });

        // Create vote buttons
        const voteButtons = shuffledAnswers.slice(0, 5).map(([odUserId, data], i) => 
            new ButtonBuilder()
                .setCustomId(`bluff_vote_${session.gameId}_${odUserId}`)
                .setLabel(`${i + 1}. ${data.username}`)
                .setStyle(ButtonStyle.Secondary)
        );

        const rows = [];
        for (let i = 0; i < voteButtons.length; i += 5) {
            rows.push(new ActionRowBuilder().addComponents(voteButtons.slice(i, i + 5)));
        }

        await message.edit({ embeds: [embed], components: rows });

        // End voting after 30 seconds
        setTimeout(() => this.finishBluffOrBust(message, session), 30000);
    }

    async finishBluffOrBust(message, session) {
        if (session.state !== 'voting') return;
        
        session.state = 'finished';
        this.activeSessions.delete(session.gameId);

        const blufferId = session.gameData.fakeAuthor;
        const bluffer = session.players.find(p => p.odUserId === blufferId);
        
        // Count correct guesses
        let correctGuesses = 0;
        const voters = [];
        for (const [voterId, votedFor] of Object.entries(session.gameData.votes)) {
            const voter = session.players.find(p => p.odUserId === voterId);
            const wasCorrect = votedFor === blufferId;
            if (wasCorrect) correctGuesses++;
            voters.push({ username: voter?.username || 'Unknown', correct: wasCorrect });
        }

        // Bluffer wins if less than half guessed correctly
        const blufferWins = correctGuesses < session.players.length / 2;
        
        let resultsText = voters.map(v => 
            `${v.correct ? '✅' : '❌'} ${v.username}`
        ).join('\n') || 'No votes cast!';

        const embed = new EmbedBuilder()
            .setColor(blufferWins ? 0xE74C3C : 0x2ECC71)
            .setTitle('🎭 Bluff or Bust - Revealed!')
            .setDescription(`**The BLUFFER was:** 🎭 **${bluffer?.username}**\n\n${blufferWins 
                ? '😈 **The bluffer fooled everyone!**' 
                : '🔍 **The bluffer was caught!**'}\n\n**Votes:**\n${resultsText}`)
            .addFields(
                { name: 'Correct Guesses', value: `${correctGuesses}/${Object.keys(session.gameData.votes).length}`, inline: true },
                { name: 'Winner', value: blufferWins ? `🎭 ${bluffer?.username}` : 'The Detectives!', inline: true }
            )
            .setTimestamp();

        await message.edit({ embeds: [embed], components: [] });

        // Save results
        if (blufferWins) {
            await this.saveGameResult(session, blufferId, bluffer?.username, 100, true);
        } else {
            // Award points to correct guessers
            for (const [voterId, votedFor] of Object.entries(session.gameData.votes)) {
                if (votedFor === blufferId) {
                    const voter = session.players.find(p => p.odUserId === voterId);
                    await this.saveGameResult(session, voterId, voter?.username, 50, true);
                }
            }
        }

        // Achievement check
        const blufferVoteCount = Object.values(session.gameData.votes).filter(v => v !== blufferId).length;
        if (blufferVoteCount >= 3) {
            // Bluffer got caught many times
            await this.grantAchievement(session.guildId, blufferId, 'bad_bluffer');
        }

        await this.postToGameResults(await message.client.guilds.fetch(session.guildId), embed);
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
    // RUN WORD HEIST GAME
    // ===========================================

    async runWordHeist(interaction, session) {
        session.state = 'active';
        session.gameData.words = [];
        session.gameData.currentTurn = 0;
        session.gameData.startTime = Date.now();
        this.activeSessions.set(session.gameId, session);

        await this.wordHeistTurn(interaction.message, session);
    }

    async wordHeistTurn(message, session) {
        if (!this.activeSessions.has(session.gameId)) return;
        
        const currentPlayer = session.players[session.gameData.currentTurn % session.players.length];
        const wordList = session.gameData.words.length > 0 
            ? session.gameData.words.slice(-10).join(', ') 
            : '(none yet)';

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle(`📚 Word Heist - ${session.gameData.category}`)
            .setDescription(`**${currentPlayer.username}'s turn!**\n\nType a word that fits the category.\n\n**Words so far:** ${wordList}\n**Total:** ${session.gameData.words.length} words`)
            .addFields({ name: '⏰ Time Limit', value: '15 seconds', inline: true })
            .setFooter({ text: `No repeats allowed! • Round ${session.gameData.words.length + 1}` });

        const skipButton = new ButtonBuilder()
            .setCustomId(`wordheist_skip_${session.gameId}`)
            .setLabel('⏭️ Skip Turn (Lose)')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(skipButton);

        await message.edit({ embeds: [embed], components: [row] });

        // Wait for message in channel
        const channel = message.channel;
        const filter = m => m.author.id === currentPlayer.odUserId && !m.author.bot;
        
        try {
            const collected = await channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: session.gameData.turnTimeLimit,
                errors: ['time']
            });

            const word = collected.first().content.toLowerCase().trim();
            
            // Delete the message to keep chat clean
            try { await collected.first().delete(); } catch {}

            // Validate word - check for duplicates
            if (session.gameData.words.includes(word)) {
                // Duplicate! Player loses
                await this.endWordHeist(message, session, currentPlayer, 'duplicate', word);
                return;
            }

            // Validate word fits category (basic validation)
            const validForCategory = this.validateWordForCategory(word, session.gameData.category);
            if (!validForCategory) {
                await this.endWordHeist(message, session, currentPlayer, 'invalid', word);
                return;
            }

            // Word is valid
            session.gameData.words.push(word);
            currentPlayer.words = (currentPlayer.words || 0) + 1;
            session.gameData.currentTurn++;
            this.activeSessions.set(session.gameId, session);

            // Quick feedback
            const feedbackEmbed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setDescription(`✅ **${currentPlayer.username}** added: **${word}**`)
                .setTimestamp();

            await message.edit({ embeds: [feedbackEmbed], components: [] });

            // Continue to next turn after short delay
            setTimeout(() => {
                if (this.activeSessions.has(session.gameId)) {
                    this.wordHeistTurn(message, session);
                }
            }, 1500);

        } catch {
            // Timeout - player loses
            await this.endWordHeist(message, session, currentPlayer, 'timeout');
        }
    }

    /**
     * Validate if a word fits the given category
     */
    validateWordForCategory(word, category) {
        // Lists of valid words per category (expanded)
        const categoryWords = {
            'Animals': ['dog', 'cat', 'lion', 'tiger', 'elephant', 'giraffe', 'zebra', 'horse', 'cow', 'pig', 'sheep', 'goat', 'chicken', 'duck', 'turkey', 'eagle', 'hawk', 'owl', 'penguin', 'dolphin', 'whale', 'shark', 'fish', 'salmon', 'tuna', 'crab', 'lobster', 'octopus', 'squid', 'snake', 'lizard', 'crocodile', 'alligator', 'turtle', 'frog', 'toad', 'bear', 'wolf', 'fox', 'deer', 'moose', 'rabbit', 'squirrel', 'mouse', 'rat', 'hamster', 'guinea', 'parrot', 'canary', 'finch', 'sparrow', 'crow', 'raven', 'pigeon', 'dove', 'seagull', 'pelican', 'flamingo', 'ostrich', 'emu', 'kangaroo', 'koala', 'platypus', 'sloth', 'monkey', 'ape', 'gorilla', 'chimpanzee', 'orangutan', 'lemur', 'panda', 'raccoon', 'skunk', 'badger', 'otter', 'beaver', 'hedgehog', 'porcupine', 'armadillo', 'bat', 'moth', 'butterfly', 'bee', 'wasp', 'ant', 'spider', 'scorpion', 'centipede', 'worm', 'snail', 'slug', 'caterpillar', 'cricket', 'grasshopper', 'dragonfly', 'firefly', 'ladybug', 'beetle', 'cockroach', 'fly', 'mosquito', 'cheetah', 'leopard', 'panther', 'jaguar', 'hyena', 'jackal', 'coyote', 'buffalo', 'bison', 'hippo', 'rhino', 'camel', 'llama', 'alpaca', 'donkey', 'mule', 'zebra', 'antelope', 'gazelle', 'ibex', 'yak'],
            'Countries': ['usa', 'canada', 'mexico', 'brazil', 'argentina', 'chile', 'peru', 'colombia', 'venezuela', 'ecuador', 'bolivia', 'paraguay', 'uruguay', 'guyana', 'suriname', 'france', 'germany', 'italy', 'spain', 'portugal', 'uk', 'england', 'scotland', 'ireland', 'wales', 'netherlands', 'belgium', 'switzerland', 'austria', 'poland', 'czech', 'hungary', 'romania', 'bulgaria', 'greece', 'turkey', 'russia', 'ukraine', 'sweden', 'norway', 'finland', 'denmark', 'iceland', 'china', 'japan', 'korea', 'india', 'pakistan', 'bangladesh', 'indonesia', 'malaysia', 'singapore', 'thailand', 'vietnam', 'philippines', 'australia', 'newzealand', 'egypt', 'morocco', 'nigeria', 'kenya', 'ethiopia', 'tanzania', 'southafrica', 'ghana', 'senegal', 'algeria', 'tunisia', 'libya', 'sudan', 'iraq', 'iran', 'syria', 'jordan', 'israel', 'lebanon', 'saudi', 'uae', 'qatar', 'kuwait', 'oman', 'yemen', 'afghanistan', 'nepal', 'bhutan', 'srilanka', 'myanmar', 'cambodia', 'laos', 'mongolia', 'taiwan', 'hongkong'],
            'Foods': ['pizza', 'burger', 'hotdog', 'sandwich', 'taco', 'burrito', 'sushi', 'ramen', 'pasta', 'lasagna', 'spaghetti', 'rice', 'bread', 'toast', 'cereal', 'oatmeal', 'pancake', 'waffle', 'egg', 'bacon', 'sausage', 'ham', 'steak', 'chicken', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'lobster', 'crab', 'salad', 'soup', 'stew', 'curry', 'chili', 'fries', 'chips', 'nachos', 'popcorn', 'pretzel', 'cookie', 'cake', 'pie', 'brownie', 'donut', 'muffin', 'croissant', 'bagel', 'biscuit', 'candy', 'chocolate', 'icecream', 'yogurt', 'cheese', 'milk', 'butter', 'cream', 'apple', 'banana', 'orange', 'grape', 'strawberry', 'blueberry', 'raspberry', 'cherry', 'peach', 'plum', 'pear', 'watermelon', 'melon', 'pineapple', 'mango', 'papaya', 'coconut', 'kiwi', 'lemon', 'lime', 'grapefruit', 'avocado', 'tomato', 'potato', 'carrot', 'broccoli', 'spinach', 'lettuce', 'cabbage', 'onion', 'garlic', 'pepper', 'cucumber', 'celery', 'corn', 'bean', 'pea', 'mushroom', 'olive', 'pickle'],
            'Movies': ['avatar', 'titanic', 'inception', 'interstellar', 'gladiator', 'matrix', 'godfather', 'jaws', 'psycho', 'alien', 'terminator', 'predator', 'rambo', 'rocky', 'joker', 'batman', 'superman', 'spiderman', 'ironman', 'hulk', 'thor', 'avengers', 'frozen', 'moana', 'coco', 'up', 'cars', 'shrek', 'minions', 'toy', 'nemo', 'dory', 'ratatouille', 'walle', 'brave', 'tangled', 'mulan', 'lion', 'aladdin', 'pocahontas', 'hercules', 'tarzan', 'bambi', 'dumbo', 'pinocchio', 'cinderella', 'sleeping', 'snow', 'beauty', 'beast', 'mermaid', 'jungle', 'aristocats', 'rango', 'madagascar', 'happy', 'penguins', 'apes', 'godzilla', 'kong', 'jurassic', 'dinosaur', 'jojo', 'bohemian', 'rocketman', 'sing', 'grease', 'mamma', 'musical', 'greatest', 'showman', 'lalaland', 'whiplash', 'moonlight', 'spotlight', 'argo', 'gravity', 'revenant', 'parasite', 'nomadland', 'minari', 'driver'],
            'Sports': ['soccer', 'football', 'basketball', 'baseball', 'hockey', 'tennis', 'golf', 'swimming', 'running', 'cycling', 'boxing', 'wrestling', 'mma', 'judo', 'karate', 'taekwondo', 'fencing', 'archery', 'shooting', 'skiing', 'snowboard', 'skating', 'gymnastics', 'diving', 'surfing', 'volleyball', 'badminton', 'table', 'cricket', 'rugby', 'lacrosse', 'handball', 'polo', 'rowing', 'sailing', 'canoeing', 'kayaking', 'triathlon', 'marathon', 'sprint', 'hurdles', 'javelin', 'discus', 'shotput', 'hammer', 'pole', 'high', 'long', 'triple', 'decathlon', 'heptathlon', 'pentathlon', 'biathlon', 'bobsled', 'luge', 'skeleton', 'curling', 'equestrian', 'dressage', 'showjumping', 'eventing', 'weightlifting', 'powerlifting', 'crossfit', 'bodybuilding', 'climbing', 'bouldering', 'rappelling', 'hiking', 'camping', 'fishing', 'hunting', 'darts', 'billiards', 'pool', 'snooker', 'bowling', 'cheerleading', 'dance', 'yoga', 'pilates', 'aerobics', 'zumba'],
            'Colors': ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey', 'silver', 'gold', 'bronze', 'copper', 'navy', 'teal', 'cyan', 'aqua', 'turquoise', 'indigo', 'violet', 'lavender', 'lilac', 'magenta', 'fuchsia', 'maroon', 'burgundy', 'crimson', 'scarlet', 'coral', 'salmon', 'peach', 'apricot', 'amber', 'mustard', 'lemon', 'lime', 'olive', 'chartreuse', 'mint', 'sage', 'forest', 'emerald', 'jade', 'khaki', 'tan', 'beige', 'cream', 'ivory', 'pearl', 'champagne', 'rose', 'blush', 'mauve', 'plum', 'eggplant', 'wine', 'ruby', 'garnet', 'sapphire', 'cobalt', 'azure', 'cerulean', 'periwinkle', 'slate', 'charcoal', 'ebony', 'onyx', 'jet'],
            'Professions': ['doctor', 'nurse', 'surgeon', 'dentist', 'pharmacist', 'therapist', 'psychologist', 'psychiatrist', 'veterinarian', 'lawyer', 'judge', 'paralegal', 'teacher', 'professor', 'principal', 'counselor', 'librarian', 'engineer', 'architect', 'scientist', 'researcher', 'chemist', 'physicist', 'biologist', 'geologist', 'astronomer', 'mathematician', 'programmer', 'developer', 'designer', 'artist', 'painter', 'sculptor', 'photographer', 'filmmaker', 'director', 'producer', 'actor', 'singer', 'musician', 'composer', 'conductor', 'dancer', 'choreographer', 'writer', 'author', 'journalist', 'reporter', 'editor', 'publisher', 'accountant', 'banker', 'economist', 'analyst', 'consultant', 'manager', 'executive', 'entrepreneur', 'salesperson', 'marketer', 'advertiser', 'realtor', 'broker', 'chef', 'baker', 'butcher', 'waiter', 'bartender', 'barista', 'pilot', 'flight', 'mechanic', 'electrician', 'plumber', 'carpenter', 'mason', 'roofer', 'painter', 'welder', 'machinist', 'firefighter', 'police', 'detective', 'security', 'soldier', 'sailor', 'marine', 'general', 'captain', 'lieutenant', 'sergeant', 'farmer', 'rancher', 'fisherman', 'miner', 'logger', 'trucker', 'driver', 'courier'],
            'Video Games': ['minecraft', 'fortnite', 'roblox', 'gta', 'callofduty', 'cod', 'halo', 'destiny', 'overwatch', 'valorant', 'csgo', 'counter', 'apex', 'pubg', 'battlefield', 'fifa', 'madden', 'nba', 'nhl', 'mario', 'zelda', 'pokemon', 'kirby', 'metroid', 'donkey', 'smash', 'splatoon', 'animal', 'crossing', 'sonic', 'crash', 'spyro', 'ratchet', 'clank', 'jak', 'daxter', 'sly', 'cooper', 'god', 'war', 'uncharted', 'last', 'horizon', 'spider', 'ghost', 'tsushima', 'demons', 'souls', 'dark', 'elden', 'ring', 'bloodborne', 'sekiro', 'resident', 'evil', 'silent', 'hill', 'outlast', 'amnesia', 'fallout', 'skyrim', 'elder', 'scrolls', 'witcher', 'cyberpunk', 'mass', 'effect', 'dragon', 'age', 'assassins', 'creed', 'far', 'cry', 'watch', 'dogs', 'tomb', 'raider', 'bioshock', 'borderlands', 'diablo', 'starcraft', 'warcraft', 'wow', 'hearthstone', 'league', 'legends', 'dota', 'smite', 'rocket', 'sims', 'simcity', 'civilization', 'age', 'empires', 'total', 'xcom', 'portal', 'half', 'life', 'left', 'dead', 'terraria', 'stardew', 'valley'],
            'Music Artists': ['beatles', 'elvis', 'michael', 'jackson', 'madonna', 'prince', 'queen', 'bowie', 'stones', 'zeppelin', 'floyd', 'sabbath', 'metallica', 'nirvana', 'radiohead', 'coldplay', 'u2', 'oasis', 'blur', 'muse', 'greenday', 'blink', 'paramore', 'panic', 'disco', 'fall', 'boy', 'chemical', 'romance', 'killers', 'strokes', 'arctic', 'monkeys', 'foo', 'fighters', 'rhcp', 'peppers', 'pearl', 'jam', 'soundgarden', 'alice', 'chains', 'tool', 'deftones', 'korn', 'slipknot', 'rammstein', 'linkin', 'park', 'evanescence', 'nightwish', 'within', 'temptation', 'epica', 'kamelot', 'blind', 'guardian', 'helloween', 'iron', 'maiden', 'judas', 'priest', 'motorhead', 'ozzy', 'dio', 'megadeth', 'anthrax', 'slayer', 'pantera', 'sepultura', 'gojira', 'mastodon', 'lamb', 'god', 'behemoth', 'opeth', 'dream', 'theater', 'rush', 'yes', 'genesis', 'king', 'crimson', 'jethro', 'tull', 'emerson', 'steely', 'dan', 'eagles', 'fleetwood', 'mac', 'acdc', 'guns', 'roses', 'aerosmith', 'bon', 'jovi', 'def', 'leppard', 'motley', 'crue', 'poison', 'whitesnake', 'ratt', 'warrant', 'skid', 'row', 'cinderella', 'tesla', 'winger'],
            'Fruits': ['apple', 'banana', 'orange', 'grape', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'cherry', 'peach', 'plum', 'pear', 'apricot', 'nectarine', 'watermelon', 'cantaloupe', 'honeydew', 'melon', 'pineapple', 'mango', 'papaya', 'coconut', 'kiwi', 'lemon', 'lime', 'grapefruit', 'tangerine', 'mandarin', 'clementine', 'kumquat', 'pomegranate', 'fig', 'date', 'prune', 'raisin', 'cranberry', 'gooseberry', 'elderberry', 'mulberry', 'boysenberry', 'loganberry', 'currant', 'lingonberry', 'acai', 'goji', 'lychee', 'longan', 'rambutan', 'durian', 'jackfruit', 'breadfruit', 'starfruit', 'dragonfruit', 'pitaya', 'guava', 'passion', 'fruit', 'tamarind', 'persimmon', 'quince', 'plantain', 'avocado']
        };

        const categoryKey = category;
        const validWords = categoryWords[categoryKey];
        
        if (!validWords) {
            // Unknown category, allow any single-word alphabetic input
            return /^[a-z]+$/.test(word) && word.length >= 2;
        }

        // Check if word is in the category list (also allow partial matches for compound words)
        return validWords.some(valid => 
            word === valid || 
            valid.includes(word) || 
            word.includes(valid)
        );
    }

    async endWordHeist(message, session, losingPlayer, reason, word = null) {
        session.state = 'finished';
        this.activeSessions.delete(session.gameId);
        await GameSession.deleteOne({ gameId: session.gameId });

        const timePlayed = Math.floor((Date.now() - session.gameData.startTime) / 1000);
        const totalWords = session.gameData.words.length;

        let reasonText;
        switch (reason) {
            case 'duplicate':
                reasonText = `❌ **${losingPlayer.username}** said "**${word}**" which was already used!`;
                break;
            case 'timeout':
                reasonText = `⏰ **${losingPlayer.username}** ran out of time!`;
                break;
            case 'skip':
                reasonText = `⏭️ **${losingPlayer.username}** skipped their turn!`;
                break;
            case 'invalid':
                reasonText = `❌ **${losingPlayer.username}** said "**${word}**" which doesn't fit the category!`;
                break;
            default:
                reasonText = `Game ended by ${losingPlayer.username}`;
        }

        // Determine winner (player(s) who didn't lose)
        const winners = session.players.filter(p => p.odUserId !== losingPlayer.odUserId);
        const winnerText = winners.length > 0 
            ? `🏆 **${winners.map(w => w.username).join(', ')}** wins!` 
            : '🤝 No winners this round!';

        // Word contribution stats
        const contributions = session.players
            .map(p => `${p.username}: ${p.words || 0} words`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('📚 Word Heist - Game Over!')
            .setDescription(`${reasonText}\n\n${winnerText}`)
            .addFields(
                { name: 'Category', value: session.gameData.category, inline: true },
                { name: 'Total Words', value: `${totalWords}`, inline: true },
                { name: 'Time Played', value: `${timePlayed}s`, inline: true },
                { name: 'Contributions', value: contributions || 'None' },
                { name: 'All Words', value: session.gameData.words.slice(0, 20).join(', ') || 'None' }
            )
            .setTimestamp();

        await message.edit({ embeds: [embed], components: [] });

        // Save results
        for (const winner of winners) {
            await this.saveGameResult(session, winner.odUserId, winner.username, winner.words || 0, true);
        }
        await this.saveGameResult(session, losingPlayer.odUserId, losingPlayer.username, losingPlayer.words || 0, false);

        // Check for word wizard achievement (50+ words contributed)
        for (const player of session.players) {
            const stats = await UserGameStats.findOne({ guildId: session.guildId, odUserId: player.odUserId });
            const totalWordContributions = (stats?.gameStats?.wordheist?.totalWords || 0) + (player.words || 0);
            
            await UserGameStats.findOneAndUpdate(
                { guildId: session.guildId, odUserId: player.odUserId },
                { $inc: { 'gameStats.wordheist.totalWords': player.words || 0 } },
                { upsert: true }
            );

            if (totalWordContributions >= 50) {
                await this.grantAchievement(session.guildId, player.odUserId, 'word_wizard');
            }
        }

        const guild = await message.client.guilds.fetch(session.guildId);
        await this.postToGameResults(guild, embed);
    }

    async handleWordHeistSkip(interaction, session) {
        const player = session.players.find(p => p.odUserId === interaction.user.id);
        if (!player) {
            return interaction.reply({ content: 'You\'re not in this game!', ephemeral: true });
        }
        
        const currentPlayer = session.players[session.gameData.currentTurn % session.players.length];
        if (interaction.user.id !== currentPlayer.odUserId) {
            return interaction.reply({ content: 'It\'s not your turn!', ephemeral: true });
        }

        await interaction.deferUpdate();
        await this.endWordHeist(interaction.message, session, player, 'skip');
    }

    // ===========================================
    // GAME 6: CHAOS VOTE
    // ===========================================

    async startChaosVote(interaction, maxPlayers = 10) {
        const gameId = this.generateGameId();
        
        const questions = [
            // Original questions
            "Who would survive a zombie apocalypse?",
            "Who would be the worst at keeping a secret?",
            "Who's most likely to become famous?",
            "Who would win in a fight?",
            "Who's the biggest snack hoarder?",
            "Who would forget their own birthday?",
            "Who's the biggest drama queen?",
            "Who would accidentally start a cult?",
            // Fun/Social
            "Who's most likely to become a millionaire?",
            "Who would cry during a Disney movie?",
            "Who talks the most trash in games?",
            "Who's the worst liar here?",
            "Who would survive longest on a deserted island?",
            "Who's most likely to go viral on TikTok?",
            "Who has the messiest room?",
            "Who would win a dance battle?",
            "Who takes the longest to get ready?",
            "Who's the biggest simp?",
            "Who would be the first to die in a horror movie?",
            "Who's the most likely to start an argument?",
            "Who's secretly the smartest?",
            "Who would be the best superhero?",
            "Who's the worst cook?",
            "Who would survive a night in a haunted house?",
            "Who's most likely to win the lottery and lose the ticket?",
            // Personality
            "Who has the best taste in music?",
            "Who would be the worst roommate?",
            "Who talks to their pets/plants?",
            "Who would forget their wedding anniversary?",
            "Who's the biggest procrastinator?",
            "Who has the wildest search history?",
            "Who would survive the hunger games?",
            "Who's most likely to get famous for something embarrassing?",
            "Who would be the best stand-up comedian?",
            "Who's the biggest night owl?",
            "Who would win a staring contest?",
            "Who's most likely to sleep through an alarm?",
            "Who would make the best villain?",
            "Who's the most competitive?",
            "Who would forget their own phone number?",
            // Skills/Abilities
            "Who would win at trivia night?",
            "Who's the best at giving advice?",
            "Who would be the worst at karaoke?",
            "Who's most likely to become a YouTuber?",
            "Who would survive longest without WiFi?",
            "Who's the best at keeping a straight face?",
            "Who would be the best secret agent?",
            "Who's most likely to talk their way out of trouble?",
            "Who would win a rap battle?",
            "Who's the most photogenic?",
            "Who would be the worst at camping?",
            "Who's most likely to cry at a wedding?",
            "Who would win a spelling bee?",
            "Who's the best at giving gifts?",
            "Who would be caught talking to themselves?",
            // Future predictions
            "Who will still be single in 10 years?",
            "Who will have the most kids?",
            "Who will become a crazy cat/dog person?",
            "Who will be the first to move to another country?",
            "Who will write a book someday?",
            "Who will become a CEO?",
            "Who will have the most interesting life story?",
            "Who will live the longest?",
            "Who will invent something?",
            "Who will end up on reality TV?",
            // Gaming specific
            "Who rages the most when gaming?",
            "Who's the biggest try-hard?",
            "Who blames lag for everything?",
            "Who would sacrifice a teammate to win?",
            "Who's the best at button mashing?",
            "Who has the worst internet?",
            "Who's most likely to throw a controller?",
            "Who talks the most in voice chat?",
            "Who goes AFK at the worst times?",
            "Who would betray the group first?",
            // Embarrassing
            "Who would trip on a flat surface?",
            "Who's most likely to send a text to the wrong person?",
            "Who would wave back at someone who wasn't waving at them?",
            "Who's most likely to walk into a glass door?",
            "Who would accidentally call their teacher 'mom'?",
            "Who's most likely to forget someone's name mid-conversation?",
            "Who would laugh at the wrong moment?",
            "Who's most likely to get caught singing in public?",
            "Who would fall asleep in a meeting?",
            "Who's most likely to spill food on themselves?",
            // Random chaos
            "Who would befriend an alien?",
            "Who's most likely to join a circus?",
            "Who would win a hot dog eating contest?",
            "Who's most likely to become a meme?",
            "Who would try to pet a wild animal?",
            "Who's most likely to get lost in their own neighborhood?",
            "Who would accidentally commit a crime?",
            "Who's most likely to believe a conspiracy theory?",
            "Who would bring a knife to a gunfight?",
            "Who's most likely to survive on $1 for a week?",
            // More questions
            "Who would be the best reality TV show host?",
            "Who would get arrested first?",
            "Who has the most embarrassing guilty pleasure?",
            "Who would panic in an emergency?",
            "Who gives the worst directions?",
            "Who would become a hermit?",
            "Who's the most oblivious?",
            "Who would be the worst babysitter?",
            "Who takes the worst photos?",
            "Who would win an eating contest?"
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
        const userId = interaction.user.id;
        const player = session.players.find(p => p.odUserId === userId);
        if (!player) {
            return await interaction.reply({ content: 'You\'re not in this game!', ephemeral: true });
        }

        // Track who has already answered to prevent multiple answers
        if (!session.gameData.answered) session.gameData.answered = {};
        if (session.gameData.answered[userId]) {
            return await interaction.reply({ content: 'You already answered!', ephemeral: true });
        }
        session.gameData.answered[userId] = parseInt(answer);

        const puzzle = session.gameData;
        const isCorrect = parseInt(answer) === puzzle.answer;
        const timeTaken = Date.now() - puzzle.startTime;

        // Show individual result to the player (ephemeral)
        if (isCorrect) {
            await interaction.reply({ 
                content: `✅ **Correct!** You answered in ${(timeTaken / 1000).toFixed(2)}s`, 
                ephemeral: true 
            });
        } else {
            await interaction.reply({ 
                content: `❌ **Wrong!** You guessed ${answer}, but the answer is ${puzzle.answer}`, 
                ephemeral: true 
            });
        }

        this.activeSessions.set(session.gameId, session);

        // Check if all players have answered
        const allAnswered = session.players.every(p => session.gameData.answered[p.odUserId] !== undefined);
        
        if (allAnswered) {
            this.activeSessions.delete(session.gameId);
            await GameSession.deleteOne({ gameId: session.gameId });

            // Calculate results
            const results = session.players.map(p => {
                const ans = session.gameData.answered[p.odUserId];
                const correct = ans === puzzle.answer;
                return { ...p, answer: ans, correct };
            });

            const winners = results.filter(r => r.correct);
            const color = winners.length > 0 ? 0x2ECC71 : 0xE74C3C;
            const title = winners.length > 0 ? '🧩 Logic Grid - Solved!' : '🧩 Logic Grid - Nobody Got It!';
            
            let resultsText = results.map(r => 
                `${r.correct ? '✅' : '❌'} **${r.username}**: ${r.answer}`
            ).join('\n');

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(`**Answer:** ${puzzle.answer}\n\nSequence: ${puzzle.sequence.join(' → ')} → **${puzzle.answer}**\n\n**Results:**\n${resultsText}`)
                .addFields(
                    { name: 'Hints Used', value: `${puzzle.hintsGiven}`, inline: true }
                )
                .setTimestamp();

            try {
                const channel = await interaction.client.channels.fetch(session.channelId);
                const msg = await channel.messages.fetch(session.messageId);
                await msg.edit({ embeds: [embed], components: [] });
            } catch {}

            // Save result
            const score = Math.max(100 - puzzle.hintsGiven * 20, 20);
            for (const r of results) {
                await this.saveGameResult(session, r.odUserId, r.username, r.correct ? score : 0, r.correct);
            }

            await this.postToGameResults(interaction.guild, embed);
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
            case 'bluff': return this.runBluffOrBust(interaction, session);
            case 'wordheist': return this.runWordHeist(interaction, session);
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
        try {
            // Validate userId
            if (!odUserId || odUserId === 'null' || odUserId === null) {
                console.error('ERROR: saveGameResult called with null userId');
                return;
            }

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
        } catch (err) {
            if (err.code === 11000) {
                // Duplicate key error - expected in race conditions, just log it
                console.log(`[Games] Race condition in saveGameResult for user ${odUserId}, game ${session.type}`);
            } else {
                console.error('Error in saveGameResult:', err.message);
            }
        }
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
        // Ensure odUserId is never null - this was causing duplicate key errors
        if (!odUserId || odUserId === 'null' || odUserId === null) {
            console.error('ERROR: updateLeaderboard called with null userId. Skipping to prevent duplicate key error.');
            return;
        }

        const today = new Date();
        const periodKey = today.toISOString().split('T')[0];
        const weekKey = `${today.getFullYear()}-W${Math.ceil(today.getDate() / 7)}`;

        try {
            // Update daily leaderboard - with proper error handling for duplicate keys
            await LeaderboardEntry.findOneAndUpdate(
                { guildId, odUserId, gameType, period: 'daily', periodKey },
                {
                    $set: { username, updatedAt: new Date() },
                    $inc: { gamesPlayed: 1, wins: isWinner ? 1 : 0 },
                    $min: { bestScore: score }
                },
                { upsert: true }
            ).catch(err => {
                // If duplicate key error, it means another operation was faster. That's OK - just skip.
                if (err.code === 11000) {
                    console.log(`[Games] Leaderboard race condition (expected), skipping update for ${odUserId} in ${gameType}`);
                } else {
                    throw err;
                }
            });

            // Update all-time leaderboard
            await LeaderboardEntry.findOneAndUpdate(
                { guildId, odUserId, gameType, period: 'alltime' },
                {
                    $set: { username, updatedAt: new Date() },
                    $inc: { gamesPlayed: 1, wins: isWinner ? 1 : 0 },
                    $min: { bestScore: score }
                },
                { upsert: true }
            ).catch(err => {
                if (err.code === 11000) {
                    console.log(`[Games] Leaderboard race condition (expected), skipping update for ${odUserId}`);
                } else {
                    throw err;
                }
            });
        } catch (err) {
            console.error(`Failed to update leaderboard for user ${odUserId}:`, err.message);
        }
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
