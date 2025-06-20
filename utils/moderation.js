const slurs = require('../slurs');
const { logModeration } = require('./logger');

/**
 * Check message content for slurs and take action
 * @param {Message} message - Discord message object
 * @returns {boolean} - True if slur was found and action taken
 */
async function moderateSlurs(message) {
    const content = message.content.toLowerCase();
    
    // Split message into words and also check the full message
    const wordsToCheck = [
        ...content.split(/\s+/), // Individual words
        content // Full message for phrase detection
    ];
    
    for (const wordOrPhrase of wordsToCheck) {
        if (!wordOrPhrase.trim()) continue;
        
        for (const slur of slurs) {
            if (!slur.trim()) continue;
            
            const normalizedSlur = slur.toLowerCase().trim();
            
            // Check if the word/phrase contains the slur (partial match, case-insensitive)
            if (wordOrPhrase.includes(normalizedSlur)) {
                try {
                    // Log the incident
                    const logMessage = `Slur detected from user ${message.author.tag} (${message.author.id}) in guild ${message.guild.name} (${message.guild.id}): "${slur}" found in "${wordOrPhrase}"`;
                    console.log(`[MODERATION] ${logMessage}`);
                    logModeration(logMessage);
                    
                    // Send warning message
                    await message.reply('⚠️ Please do not use bad words or slurs. Continued use will result in a ban.');
                    
                    // Ban the user immediately
                    if (message.member && message.member.bannable) {
                        await message.member.ban({ 
                            reason: `Used slur: ${slur}`,
                            deleteMessageDays: 1 // Delete their messages from the last day
                        });
                        
                        const banLogMessage = `User ${message.author.tag} (${message.author.id}) was banned for using slur: "${slur}"`;
                        console.log(`[MODERATION] ${banLogMessage}`);
                        logModeration(banLogMessage);
                        
                        // Try to delete the original message
                        try {
                            await message.delete();
                        } catch (deleteError) {
                            console.error('[MODERATION] Failed to delete message:', deleteError);
                        }
                        
                    } else {
                        const errorMessage = `Failed to ban user ${message.author.tag} (${message.author.id}) - insufficient permissions or user not bannable`;
                        console.error(`[MODERATION] ${errorMessage}`);
                        logModeration(errorMessage);
                    }
                    
                } catch (error) {
                    const errorMessage = `Failed to moderate user ${message.author.tag} (${message.author.id}) for slur "${slur}": ${error.message}`;
                    console.error('[MODERATION]', errorMessage);
                    logModeration(errorMessage);
                }
                
                return true; // Slur found and action taken
            }
        }
    }
    
    return false; // No slurs found
}

/**
 * Normalize text for better slur detection (removes special characters, handles leetspeak, etc.)
 * @param {string} text - Text to normalize
 * @returns {string} - Normalized text
 */
function normalizeForSlurDetection(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces and numbers
        .replace(/0/g, 'o') // Handle basic leetspeak
        .replace(/1/g, 'i')
        .replace(/3/g, 'e')
        .replace(/4/g, 'a')
        .replace(/5/g, 's')
        .replace(/7/g, 't')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

/**
 * Enhanced slur detection with normalization
 * @param {Message} message - Discord message object
 * @returns {boolean} - True if slur was found and action taken
 */
async function enhancedSlurModeration(message) {
    const originalContent = message.content;
    const normalizedContent = normalizeForSlurDetection(originalContent);
    
    // Check both original and normalized content
    const contentsToCheck = [originalContent, normalizedContent];
    
    for (const content of contentsToCheck) {
        const wordsToCheck = [
            ...content.toLowerCase().split(/\s+/), // Individual words
            content.toLowerCase() // Full message
        ];
        
        for (const wordOrPhrase of wordsToCheck) {
            if (!wordOrPhrase.trim()) continue;
            
            for (const slur of slurs) {
                if (!slur.trim()) continue;
                
                const normalizedSlur = slur.toLowerCase().trim();
                
                // Exact match or contains match
                if (wordOrPhrase === normalizedSlur || wordOrPhrase.includes(normalizedSlur)) {
                    try {
                        // Log the incident with more details
                        const logMessage = `SLUR DETECTED:
                        User: ${message.author.tag} (${message.author.id})
                        Guild: ${message.guild.name} (${message.guild.id})
                        Channel: ${message.channel.name} (${message.channel.id})
                        Original Message: "${originalContent}"
                        Detected Slur: "${slur}"
                        Found in: "${wordOrPhrase}"
                        Timestamp: ${new Date().toISOString()}`;
                        
                        console.log(`[MODERATION] ${logMessage}`);
                        logModeration(logMessage);
                        
                        // Send warning message
                        const warningMessage = await message.reply('⚠️ Please do not use bad words or slurs. Continued use will result in a ban.');
                        
                        // Ban the user immediately
                        if (message.member && message.member.bannable) {
                            await message.member.ban({ 
                                reason: `Used slur: "${slur}" in message: "${originalContent.substring(0, 100)}${originalContent.length > 100 ? '...' : ''}"`,
                                deleteMessageDays: 1
                            });
                            
                            const banLogMessage = `User ${message.author.tag} (${message.author.id}) has been BANNED for using slur: "${slur}"`;
                            console.log(`[MODERATION] ${banLogMessage}`);
                            logModeration(banLogMessage);
                            
                            // Delete the original message and warning
                            try {
                                await message.delete();
                                setTimeout(async () => {
                                    try {
                                        await warningMessage.delete();
                                    } catch (e) {
                                        console.error('[MODERATION] Failed to delete warning message:', e);
                                    }
                                }, 5000); // Delete warning after 5 seconds
                            } catch (deleteError) {
                                console.error('[MODERATION] Failed to delete messages:', deleteError);
                            }
                            
                        } else {
                            const errorMessage = `FAILED TO BAN: User ${message.author.tag} (${message.author.id}) used slur "${slur}" but could not be banned (insufficient permissions or user not bannable)`;
                            console.error(`[MODERATION] ${errorMessage}`);
                            logModeration(errorMessage);
                            
                            // Still try to delete the message
                            try {
                                await message.delete();
                            } catch (deleteError) {
                                console.error('[MODERATION] Failed to delete message:', deleteError);
                            }
                        }
                        
                    } catch (error) {
                        const errorMessage = `ERROR in slur moderation for user ${message.author.tag} (${message.author.id}), slur "${slur}": ${error.message}`;
                        console.error('[MODERATION]', errorMessage);
                        logModeration(errorMessage);
                    }
                    
                    return true; // Slur found and action taken
                }
            }
        }
    }
    
    return false; // No slurs found
}

module.exports = {
    moderateSlurs,
    enhancedSlurModeration,
    normalizeForSlurDetection
};