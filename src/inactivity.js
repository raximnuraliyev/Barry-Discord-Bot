const { EmbedBuilder } = require('discord.js');
const DatabaseHandler = require('./database');

class InactivityHandler {
    constructor() {
        this.database = new DatabaseHandler();
        this.checkinMessages = [
            "Hey {user}, just checking in! Haven't seen you around lately. Everything okay?",
            "Yo {user}, where you been? The server's been too quiet without you.",
            "Miss me, {user}? Because I definitely didn't miss you. (Just kidding, come back!)",
            "Hey {user}, your absence has been noted. And by noted, I mean I'm bored.",
            "Sup {user}, still alive? Just making sure you didn't get lost in the real world.",
            "Hey {user}, the server's been asking about you. Well, I'm asking. Same thing.",
            "Yo {user}, time for your mandatory check-in. Don't make me come find you!",
            "Hey {user}, been MIA lately. Everything good or should I send a search party?"
        ];
    }

    async checkInactiveUsers(client) {
        console.log('Checking for inactive users...');
        
        for (const guild of client.guilds.cache.values()) {
            const inactiveUsers = this.database.getInactiveUsers(guild.id, 7);
            
            for (const userData of inactiveUsers) {
                const member = guild.members.cache.get(userData.userId);
                if (!member) continue;

                if (userData.missedCheckins >= 3) {
                    // Flag to mods after 3 missed check-ins
                    await this.flagToMods(guild, member, userData.missedCheckins);
                } else {
                    // Send check-in message
                    await this.sendCheckinMessage(guild, member);
                    this.database.incrementMissedCheckins(userData.userId, guild.id);
                }
            }
        }
    }

    async sendCheckinMessage(guild, member) {
        const message = this.checkinMessages[Math.floor(Math.random() * this.checkinMessages.length)]
            .replace('{user}', `<@${member.id}>`);
        
        try {
            // Try to send DM first
            await member.send(message);
            console.log(`Sent DM check-in to ${member.user.tag}`);
        } catch (error) {
            // If DM fails, send in general channel
            const generalChannel = guild.channels.cache.find(ch => 
                ch.name.includes('general') || ch.name.includes('chat')
            ) || guild.systemChannel;
            
            if (generalChannel) {
                await generalChannel.send(message);
                console.log(`Sent public check-in to ${member.user.tag}`);
            }
        }
    }

    async flagToMods(guild, member, missedCheckins) {
        const modChannel = guild.channels.cache.find(ch => ch.name === 'barry-mods');
        if (!modChannel) return;

        const daysInactive = Math.floor((Date.now() - this.database.getUserData(member.id, guild.id).lastActivity) / (24 * 60 * 60 * 1000));
        
        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('📝 Inactive User Flag')
            .setDescription(`${member.user.tag} has been inactive for ${daysInactive} days`)
            .addFields(
                { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
                { name: 'Missed Check-ins', value: missedCheckins.toString(), inline: true },
                { name: 'Last Activity', value: `<t:${Math.floor(this.database.getUserData(member.id, guild.id).lastActivity / 1000)}:R>`, inline: true }
            )
            .setTimestamp();

        await modChannel.send({ embeds: [embed] });
        console.log(`Flagged ${member.user.tag} to mods for inactivity`);
    }

    async generateWeeklyReport(guild) {
        const stats = this.database.getServerStats(guild.id);
        const inactiveUsers = this.database.getInactiveUsers(guild.id, 7);
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📊 Weekly Server Report')
            .setDescription(`Weekly summary for ${guild.name}`)
            .addFields(
                { name: 'Total Members', value: guild.memberCount.toString(), inline: true },
                { name: 'Actions This Week', value: stats.actionsThisWeek.toString(), inline: true },
                { name: 'Inactive Users', value: inactiveUsers.length.toString(), inline: true },
                { name: 'Bans', value: stats.bansThisWeek.toString(), inline: true },
                { name: 'Timeouts', value: stats.mutesThisWeek.toString(), inline: true },
                { name: 'Warnings', value: stats.warningsThisWeek.toString(), inline: true }
            )
            .setTimestamp();

        const modChannel = guild.channels.cache.find(ch => ch.name === 'barry-mods');
        if (modChannel) {
            await modChannel.send({ embeds: [embed] });
        }
    }
}

module.exports = InactivityHandler;