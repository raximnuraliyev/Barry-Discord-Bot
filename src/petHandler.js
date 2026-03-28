const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const PetEcosystem = require('./petEcosystem');
const { ServerPet } = require('./models');

class PetHandler {
    constructor(client) {
        this.client = client;
        this.petEcosystem = new PetEcosystem(client);
    }

    initialize() {
        this.petEcosystem.initialize();
    }

    async displayPet(serverId, channel) {
        try {
            const pet = await ServerPet.findOne({ serverId });
            if (!pet) {
                return await channel.send('No pet found in this server! Ask an admin to spawn one with `/spawnpet`.');
            }

            // Create embed with pet info
            const embed = new EmbedBuilder()
                .setTitle(`${pet.petName} 🐱`)
                .setDescription(this.getPhaseDescription(pet.phase, pet.stats))
                .addFields(this.petEcosystem.formatStatsEmbed(pet).fields)
                .setColor(0x7289da)
                .setImage(`attachment://pet.jpg`);

            // Create buttons for this phase
            const buttons = this.petEcosystem.getPhaseButtonsForPhase(pet.phase);
            const rows = [];

            for (let i = 0; i < buttons.length; i += 5) {
                const rowButtons = buttons.slice(i, i + 5).map(btn =>
                    new ButtonBuilder()
                        .setCustomId(btn.id)
                        .setLabel(btn.label)
                        .setStyle(ButtonStyle.Primary)
                );
                rows.push(new ActionRowBuilder().addComponents(rowButtons));
            }

            // Send message with image
            const imageUrl = this.getImageUrl(pet.petType, pet.phase);
            const files = [];

            // Try to load local image or use placeholder
            try {
                const fs = require('fs');
                const path = require('path');
                const imagePath = path.join(__dirname, `../public/${this.petEcosystem.petTypes[pet.petType]}/($${this.petEcosystem.petTypes[pet.petType]})The ${this.getPhaseNameByNumber(pet.phase)}.jpg`);

                if (fs.existsSync(imagePath)) {
                    files.push(imagePath);
                    embed.setImage('attachment://pet.jpg');
                }
            } catch (err) {
                // Silently fail and just use no image
            }

            const message = await channel.send({
                embeds: [embed],
                components: rows,
                files: files.length > 0 ? files : undefined
            });

            return message;
        } catch (err) {
            console.error('Error displaying pet:', err);
            return await channel.send('Failed to display pet.');
        }
    }

    async handlePetButton(interaction) {
        const buttonId = interaction.customId;
        const serverId = interaction.guildId;

        try {
            await interaction.deferReply({ ephemeral: true });

            const pet = await ServerPet.findOne({ serverId });
            if (!pet) {
                return await interaction.editReply('No pet found!');
            }

            let result = {};
            let message = '';

            switch (buttonId) {
                case 'pet_warm':
                    result = await this.petEcosystem.addWarmth(serverId, interaction.user.id);
                    message = `🌡️ You warmed the egg! Warmth Score: ${result.warmthScore}/3 today. ${result.daysRemaining} days until hatching.`;
                    break;

                case 'pet_feed':
                    result = await this.petEcosystem.feedPet(serverId, interaction.user.id);
                    message = `🍼 You fed ${pet.petName}! Hunger down to ${result.hunger}%.`;
                    break;

                case 'pet_play':
                    result = await this.petEcosystem.playWithPet(serverId, interaction.user.id);
                    message = `🧶 You played with ${pet.petName}! Happiness is now ${result.happiness}%.`;
                    break;

                case 'pet_clean':
                    result = await this.petEcosystem.cleanPet(serverId, interaction.user.id);
                    message = `🧽 You cleaned ${pet.petName}! Cleanliness is now ${result.cleanliness}%.`;
                    break;

                case 'pet_bribe':
                    // Modal or direct request for points (simplified for now - asks in follow-up)
                    message = 'Bribe feature coming soon! Use the Pet Store to contribute points.';
                    break;

                case 'pet_expedition':
                    if (pet.phase !== 4) {
                        return await interaction.editReply('Pet is not ready for expeditions!');
                    }
                    result = await this.petEcosystem.sendOnExpedition(serverId, interaction.user.id);
                    message = `🚀 ${pet.petName} departed on an expedition! They'll return <t:${Math.floor(result.returnTime.getTime() / 1000)}:R>`;
                    break;

                default:
                    message = 'Unknown action!';
            }

            await interaction.editReply(message);

            // Update the main pet display after action
            await this.updatePetDisplay(interaction.channel, serverId);

        } catch (err) {
            console.error('Pet button error:', err);
            await interaction.editReply(`Error: ${err.message}`);
        }
    }

    async updatePetDisplay(channel, serverId) {
        try {
            const pet = await ServerPet.findOne({ serverId });
            if (!pet) return;

            // Create a fresh display
            const embed = new EmbedBuilder()
                .setTitle(`${pet.petName} 🐱`)
                .setDescription(this.getPhaseDescription(pet.phase, pet.stats))
                .addFields(this.petEcosystem.formatStatsEmbed(pet).fields)
                .setColor(0x7289da);

            const buttons = this.petEcosystem.getPhaseButtonsForPhase(pet.phase);
            const rows = [];

            for (let i = 0; i < buttons.length; i += 5) {
                const rowButtons = buttons.slice(i, i + 5).map(btn =>
                    new ButtonBuilder()
                        .setCustomId(btn.id)
                        .setLabel(btn.label)
                        .setStyle(ButtonStyle.Primary)
                );
                rows.push(new ActionRowBuilder().addComponents(rowButtons));
            }

            // Send updated version
            await channel.send({
                embeds: [embed],
                components: rows
            });
        } catch (err) {
            // Silently fail
        }
    }

    getPhaseDescription(phase, stats) {
        switch (phase) {
            case 1:
                return '🥚 **The Egg Phase** - The pet is still incubating. Keep it warm!';
            case 2:
                return `👶 **The Baby Phase** - A chaotic gremlin! Keep it fed and happy.${stats.hunger > 70 ? ' ⚠️ CHAOS EVENT ACTIVE' : ''}`;
            case 3:
                return `🧒 **The Teen Phase** - Moody and greedy! It\'s hoarding points.${stats.happiness < 50 ? ' 👛 HOARDING ACTIVE' : ''}`;
            case 4:
                return '🦸 **The Adult Phase** - Your server guardian! Sending it on expeditions grants rare loot.';
            default:
                return 'Unknown phase';
        }
    }

    getPhaseNameByNumber(phase) {
        const names = { 1: 'Egg', 2: 'Baby', 3: 'Teen', 4: 'Adult' };
        return names[phase] || 'Unknown';
    }

    getImageUrl(petType, phase) {
        const typeNames = {
            black_cat: 'The Black Cat',
            cyber_shiba: 'The Cyber Shiba',
            tech_owl: 'The Tech Owl',
            white_cat: 'The White Cat',
            digital_slime: 'The Digital Slime'
        };
        const phaseName = this.getPhaseNameByNumber(phase);
        return `./public/${typeNames[petType]}/($${typeNames[petType]})The ${phaseName} Phase.jpg`;
    }

    async handleMessageChaosEvent(message, serverId) {
        try {
            const pet = await ServerPet.findOne({ serverId });

            if (!pet || !pet.chaosEventActive || pet.phase !== 2) return;

            // 5% chance the pet "eats" the message
            if (Math.random() > 0.05) return;

            // Delete the message
            try {
                await message.delete();
            } catch (err) {
                return; // Can't delete, skip
            }

            // Send chaos embed
            const chaosEmbed = new EmbedBuilder()
                .setTitle(`🌪️ CHAOS EVENT`)
                .setDescription(`${pet.petName} got into a chaotic mood and ate <@${message.author.id}>'s message!\n\n> "${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}"`)
                .setColor(0xff6b6b)
                .setFooter({ text: 'The baby is unleashed...' });

            try {
                await message.channel.send({ embeds: [chaosEmbed] });
            } catch (err) {
                // Silent fail
            }
        } catch (err) {
            // Silent fail
        }
    }
}

module.exports = PetHandler;
