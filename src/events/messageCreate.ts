import { Events, Message } from 'discord.js';
import { config } from '../../config/bot.js';
import { Logger } from '../utils/logger.js';

export default {
    name: Events.MessageCreate,
    execute(message: Message) {
        // Ignore messages from bots
        if (message.author.bot) return;
        
        // Only listen to the configured channel (if specified)
        if (config.listenChannelId && message.channel.id !== config.listenChannelId) {
            return;
        }

        const channelName = message.channel.type === 1 ? 'DM' : 
                           'name' in message.channel ? message.channel.name : 'Unknown';
        
        Logger.info(`📨 Message from ${message.author.tag} in #${channelName}: ${message.content}`);
        
        // Basic message processing
        const messageData = {
            id: message.id,
            content: message.content,
            author: {
                id: message.author.id,
                username: message.author.username,
                displayName: message.author.displayName,
                tag: message.author.tag,
            },
            channel: {
                id: message.channel.id,
                name: channelName,
                type: message.channel.type,
            },
            guild: {
                id: message.guild?.id,
                name: message.guild?.name,
            },
            timestamp: message.createdTimestamp,
        };

        // TODO: Process message with AI (will be implemented in Task 3)
        // TODO: Store user data in database (will be implemented in Task 6-7)
        
        // For now, just log the structured data
        Logger.debug('📊 Processed message data:', messageData);
        
        // Simple echo response for testing (remove later)
        if (message.content.toLowerCase().startsWith('!test')) {
            message.reply('🤖 Bot is working! Ready for AI integration.');
            Logger.success(`✅ Test command executed by ${message.author.tag}`);
        }
    },
};