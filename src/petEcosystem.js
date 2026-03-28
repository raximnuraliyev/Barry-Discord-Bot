const { ServerPet, PetInventory, PetInteraction } = require('./models');
const cron = require('node-cron');

class PetEcosystem {
    constructor(client) {
        this.client = client;
        this.petTypes = {
            black_cat: 'The Black Cat',
            cyber_shiba: 'The Cyber Shiba',
            tech_owl: 'The Tech Owl',
            white_cat: 'The White Cat',
            digital_slime: 'The Digital Slime'
        };
        this.messageDeleteQueue = new Map(); // serverId -> array of pending deletes
    }

    // Initialize pet ecosystem - setup cron jobs
    initialize() {
        // Every hour: decay stats
        cron.schedule('0 * * * *', () => this.decayStats());

        // Daily at midnight: evaluate warmth score for Phase 1
        cron.schedule('0 0 * * *', () => this.evaluateWarmthScore());

        // Every 10 minutes: process chaos events
        cron.schedule('*/10 * * * *', () => this.processChaosEvents());

        // Every 6 hours: process expeditions
        cron.schedule('0 */6 * * *', () => this.processExpeditions());

        console.log('Pet Ecosystem initialized with cron jobs');
    }

    // ==================== PHASE 1: EGG ====================
    async spawnPet(serverId, petType = 'black_cat') {
        const existingPet = await ServerPet.findOne({ serverId });
        if (existingPet) {
            throw new Error('This server already has a pet!');
        }

        const pet = new ServerPet({
            serverId,
            petType,
            phase: 1,
            incubationDaysRemaining: 5
        });

        await pet.save();
        return pet;
    }

    async addWarmth(serverId, userId) {
        const pet = await ServerPet.findOne({ serverId });
        if (!pet || pet.phase !== 1) {
            throw new Error('Pet is not in Egg phase');
        }

        const today = new Date().toDateString();
        const lastReset = pet.warmthLastReset?.toDateString();

        // Check if user already warmed today
        const todayInteraction = await PetInteraction.findOne({
            serverId,
            userId,
            actionType: 'warm',
            timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });

        if (todayInteraction) {
            throw new Error('You have already warmed the egg today! Come back tomorrow.');
        }

        // Reset warmth score at midnight
        if (lastReset !== today) {
            pet.warmthScore = 0;
            pet.warmthLastReset = new Date();
        }

        // Increment warmth score for this unique user
        pet.warmthScore += 1;

        // Record interaction
        await PetInteraction.create({
            serverId,
            userId,
            actionType: 'warm',
            resultData: { warmthContribution: 1 }
        });

        await pet.save();
        return { warmthScore: pet.warmthScore, daysRemaining: pet.incubationDaysRemaining };
    }

    async evaluateWarmthScore() {
        const pets = await ServerPet.find({ phase: 1 });

        for (const pet of pets) {
            const requiredWarmth = 3; // Minimum unique users per day

            if (pet.warmthScore >= requiredWarmth) {
                pet.incubationDaysRemaining -= 1;

                if (pet.incubationDaysRemaining <= 0) {
                    // Phase 1 complete, upgrade to Phase 2
                    await this.upgradeToPhase2(pet);
                } else {
                    await pet.save();
                }
            } else {
                // Insufficient warmth, reset
                pet.warmthScore = 0;
                await pet.save();
            }
        }
    }

    async upgradeToPhase2(pet) {
        pet.phase = 2;
        pet.phaseUpgradedAt = new Date();
        pet.lastStatUpdate = new Date();
        // Initialize stats for phase 2
        pet.stats = {
            hunger: 50,
            energy: 50,
            happiness: 60,
            cleanliness: 70
        };
        await pet.save();
        console.log(`Pet in server ${pet.serverId} upgraded to Phase 2!`);
    }

    // ==================== PHASE 2: BABY ====================
    async decayStats() {
        const petsInPhase2 = await ServerPet.find({ phase: 2 });

        for (const pet of petsInPhase2) {
            // Decay 5% per hour
            pet.stats.hunger = Math.max(0, Math.min(100, pet.stats.hunger + 5)); // Hunger increases (gets hungrier)
            pet.stats.energy = Math.max(0, pet.stats.energy - 5); // Energy decreases
            pet.stats.happiness = Math.max(0, pet.stats.happiness - 2); // Slight happiness decay
            pet.stats.cleanliness = Math.max(0, pet.stats.cleanliness - 3); // Gets dirtier

            // Check for chaos event trigger
            if (pet.stats.hunger > 70 && !pet.flags.isHoarding && !pet.chaosEventActive) {
                pet.chaosEventActive = true;
                pet.chaosEventEndTime = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
            }

            pet.lastStatUpdate = new Date();
            await pet.save();
        }
    }

    async feedPet(serverId, userId) {
        const pet = await ServerPet.findOne({ serverId });
        if (!pet) throw new Error('No pet found');
        if (pet.phase !== 2 && pet.phase !== 3 && pet.phase !== 4) {
            throw new Error('Pet cannot be fed at this stage');
        }

        // Reduce hunger
        pet.stats.hunger = Math.max(0, pet.stats.hunger - 20);
        pet.lastStatUpdate = new Date();

        await PetInteraction.create({
            serverId,
            userId,
            actionType: 'feed'
        });

        await pet.save();
        return pet.stats;
    }

    async playWithPet(serverId, userId) {
        const pet = await ServerPet.findOne({ serverId });
        if (!pet) throw new Error('No pet found');
        if (pet.phase !== 2 && pet.phase !== 3 && pet.phase !== 4) {
            throw new Error('Pet cannot play at this stage');
        }

        // Increase happiness, decrease energy
        pet.stats.happiness = Math.min(100, pet.stats.happiness + 15);
        pet.stats.energy = Math.max(0, pet.stats.energy - 15);
        pet.lastStatUpdate = new Date();

        await PetInteraction.create({
            serverId,
            userId,
            actionType: 'play'
        });

        await pet.save();
        return pet.stats;
    }

    async cleanPet(serverId, userId) {
        const pet = await ServerPet.findOne({ serverId });
        if (!pet) throw new Error('No pet found');
        if (pet.phase !== 2 && pet.phase !== 3 && pet.phase !== 4) {
            throw new Error('Pet cannot be cleaned at this stage');
        }

        // Increase cleanliness
        pet.stats.cleanliness = Math.min(100, pet.stats.cleanliness + 25);
        pet.lastStatUpdate = new Date();

        await PetInteraction.create({
            serverId,
            userId,
            actionType: 'clean'
        });

        await pet.save();
        return pet.stats;
    }

    async processChaosEvents() {
        const petsWithChaos = await ServerPet.find({
            'flags.isHoarding': false,
            chaosEventActive: true,
            chaosEventEndTime: { $gt: new Date() }
        });

        // Chaos events are handled via messageCreate listener
        // This just manages the timer
        for (const pet of petsWithChaos) {
            if (pet.chaosEventEndTime < new Date()) {
                pet.chaosEventActive = false;
                await pet.save();
            }
        }
    }

    // ==================== PHASE 3: TEEN ====================
    async bribePetWithPoints(serverId, userId, pointsOffered) {
        const pet = await ServerPet.findOne({ serverId });
        if (!pet) throw new Error('No pet found');
        if (pet.phase !== 3) {
            throw new Error('Pet can only be bribed in Teen phase');
        }

        // Record bribe interaction for pool total
        await PetInteraction.create({
            serverId,
            userId,
            actionType: 'bribe',
            pointsContributed: pointsOffered
        });

        // Calculate total points contributed today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const totalBribestoday = await PetInteraction.aggregate([
            {
                $match: {
                    serverId,
                    actionType: 'bribe',
                    timestamp: { $gte: today }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$pointsContributed' }
                }
            }
        ]);

        const totalPoints = totalBribestoday[0]?.total || 0;

        // Check if threshold reached (e.g., 5000 points)
        if (totalPoints >= 5000) {
            pet.stats.happiness = Math.min(100, pet.stats.happiness + 30);
            if (pet.stats.happiness >= 80) {
                pet.flags.isHoarding = false;
                pet.hoardedPoints = 0; // Return hoarded points
            }
        }

        await pet.save();
        return { totalBribed: totalPoints, petHappiness: pet.stats.happiness };
    }

    // ==================== PHASE 4: ADULT ====================
    async sendOnExpedition(serverId, userId) {
        const pet = await ServerPet.findOne({ serverId });
        if (!pet) throw new Error('No pet found');
        if (pet.phase !== 4) {
            throw new Error('Pet can only go on expeditions in Adult phase');
        }

        if (pet.flags.onExpedition) {
            throw new Error('Pet is already on an expedition!');
        }

        // Lock pet for 12 hours
        pet.flags.onExpedition = true;
        pet.expeditionEndTime = new Date(Date.now() + 12 * 60 * 60 * 1000);

        await PetInteraction.create({
            serverId,
            userId,
            actionType: 'expedition'
        });

        await pet.save();
        return { message: 'Pet departed on expedition!', returnTime: pet.expeditionEndTime };
    }

    async processExpeditions() {
        const petsOnExpedition = await ServerPet.find({
            'flags.onExpedition': true,
            expeditionEndTime: { $lt: new Date() }
        });

        for (const pet of petsOnExpedition) {
            // Return from expedition
            pet.flags.onExpedition = false;

            // Randomize loot
            const lootPool = ['bonus_points', 'cosmetic_role', 'warn_bypass'];
            const loot = lootPool[Math.floor(Math.random() * lootPool.length)];
            pet.lastExpeditionLoot = loot;

            // Award based on loot
            if (loot === 'bonus_points') {
                pet.hoardedPoints = Math.min(pet.hoardedPoints + 500, 5000);
            }

            await pet.save();
        }
    }

    // ==================== PHASE UPGRADES ====================
    async checkPhaseUpgrades() {
        const pets = await ServerPet.find({});

        for (const pet of pets) {
            if (pet.phase === 2 && pet.stats.happiness > 80) {
                // Phase 2 -> Phase 3
                await this.upgradeToPhase3(pet);
            } else if (pet.phase === 3 && pet.stats.happiness > 90) {
                // Phase 3 -> Phase 4
                await this.upgradeToPhase4(pet);
            }
        }
    }

    async upgradeToPhase3(pet) {
        pet.phase = 3;
        pet.phaseUpgradedAt = new Date();
        console.log(`Pet in server ${pet.serverId} upgraded to Phase 3!`);
        await pet.save();
    }

    async upgradeToPhase4(pet) {
        pet.phase = 4;
        pet.phaseUpgradedAt = new Date();
        console.log(`Pet in server ${pet.serverId} upgraded to Phase 4!`);
        await pet.save();
    }

    // ==================== ECONOMY MIDDLEWARE ====================
    /**
     * Apply economy tax if pet is in hoarding phase
     * Returns: { originalPoints, taxedAmount, finalPoints, taxApplied, hoardedAdded }
     */
    async applyEconomyTax(serverId, pointsAwarded) {
        const pet = await ServerPet.findOne({ serverId });

        const result = {
            originalPoints: pointsAwarded,
            taxedAmount: 0,
            finalPoints: pointsAwarded,
            taxApplied: false,
            hoardedAdded: 0
        };

        if (!pet || pet.phase !== 3 || !pet.flags.isHoarding) {
            return result; // No tax applies
        }

        // Apply 20% tax during hoarding phase
        const taxAmount = Math.floor(pointsAwarded * 0.2);
        result.taxedAmount = taxAmount;
        result.finalPoints = pointsAwarded - taxAmount;
        result.taxApplied = true;
        result.hoardedAdded = taxAmount;

        // Add to hoarded points
        pet.hoardedPoints += taxAmount;
        await pet.save();

        return result;
    }

    // ==================== UTILITIES ====================
    getPhaseImageUrl(petType, phase) {
        const phaseNames = {
            1: 'Egg',
            2: 'Baby',
            3: 'Teen',
            4: 'Adult'
        };
        const petName = this.petTypes[petType];
        return `./public/${petName}/($${petName})The ${phaseNames[phase]} Phase.jpg`;
    }

    getPhaseButtonsForPhase(phase) {
        switch (phase) {
            case 1:
                return [{ label: '🌡️ Keep Warm', id: 'pet_warm' }];
            case 2:
                return [
                    { label: '🍼 Feed', id: 'pet_feed' },
                    { label: '🧶 Play', id: 'pet_play' },
                    { label: '🧽 Clean', id: 'pet_clean' }
                ];
            case 3:
                return [
                    { label: '🍼 Feed', id: 'pet_feed' },
                    { label: '🧶 Play', id: 'pet_play' },
                    { label: '🧽 Clean', id: 'pet_clean' },
                    { label: '🎁 Bribe (Pet Store)', id: 'pet_bribe' }
                ];
            case 4:
                return [
                    { label: '🍼 Feed', id: 'pet_feed' },
                    { label: '🧶 Play', id: 'pet_play' },
                    { label: '🧽 Clean', id: 'pet_clean' },
                    { label: '🚀 Send on Expedition', id: 'pet_expedition' }
                ];
            default:
                return [];
        }
    }

    formatStatsEmbed(pet) {
        const phaseNames = ['Unknown', 'Egg', 'Baby', 'Teen', 'Adult'];
        const statusBar = (value) => {
            const filled = Math.round(value / 10);
            return '█'.repeat(filled) + '░'.repeat(10 - filled);
        };

        return {
            title: `${pet.petName} - ${phaseNames[pet.phase]} Phase`,
            description: `Type: ${this.petTypes[pet.petType] || 'Unknown'}`,
            fields: [
                { name: '🍖 Hunger', value: `${statusBar(pet.stats.hunger)} ${pet.stats.hunger}%`, inline: false },
                { name: '⚡ Energy', value: `${statusBar(pet.stats.energy)} ${pet.stats.energy}%`, inline: false },
                { name: '💖 Happiness', value: `${statusBar(pet.stats.happiness)} ${pet.stats.happiness}%`, inline: false },
                { name: '✨ Cleanliness', value: `${statusBar(pet.stats.cleanliness)} ${pet.stats.cleanliness}%`, inline: false }
            ],
            color: 0x7289da,
            timestamp: new Date()
        };
    }
}

module.exports = PetEcosystem;
