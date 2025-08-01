import { Client, Events } from 'discord.js';
import { Logger } from '../utils/logger.js';
import { ChannelManager } from '../utils/channelManager.js';

export default {
    name: Events.ClientReady,
    once: true,
    execute(client: Client) {
        Logger.success('Discord AI Chatbot is ready!');
        Logger.info(`Logged in as: ${client.user?.tag}`);
        Logger.info(`Connected to ${client.guilds.cache.size} server(s)`);
        Logger.info(`Serving ${client.users.cache.size} users`);
        
        // Initialize and log channel configuration
        const channelManager = new ChannelManager(client);
        channelManager.logConfiguration();
        
        const stats = channelManager.getChannelStats();
        Logger.info(`📊 Channel Stats: ${stats.totalChannels} total, ${stats.listenChannels} listening, ${stats.ignoredChannels} ignored`);
        
        // Set bot activity status
        client.user?.setActivity('Learning about server members', { 
            type: 3 // Watching
        });
        
        Logger.success('🎯 Bot is now listening for messages and learning...');
        Logger.info('💡 Send "!test" in your configured channel to verify functionality');
    },
};