import { Events, Message } from 'discord.js';
import { Logger } from '../utils/logger.js';
import { ChannelManager } from '../utils/channelManager.js';

// Global channel manager instance (will be set by main bot)
let channelManager: ChannelManager;

export function setChannelManager(manager: ChannelManager) {
    channelManager = manager;
}

export default {
    name: Events.MessageCreate,
    execute(message: Message) {
        // Ignore messages from bots
        if (message.author.bot) return;
        
        // Check if we should listen to this channel
        if (channelManager && !channelManager.shouldListenToChannel(message.channel.id)) {
            return;
        }

        const channelInfo = channelManager 
            ? channelManager.getChannelInfo(message.channel)
            : { name: 'Unknown', type: 'Unknown', isListening: true };
        
        Logger.info(`📨 Message from ${message.author.tag} in #${channelInfo.name} (${channelInfo.type}): ${message.content}`);
        
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
                name: channelInfo.name,
                type: channelInfo.type,
                isListening: channelInfo.isListening,
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