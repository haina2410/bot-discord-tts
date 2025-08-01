import { Client, Events } from 'discord.js';
import { Logger } from '../utils/logger.js';
import { ChannelManager } from '../utils/channelManager.js';

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client) {
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
        
        // Initialize AI Manager
        const aiManager = (client as any).aiManager;
        if (aiManager) {
            Logger.info('🧠 Initializing AI Manager...');
            try {
                const aiInitialized = await aiManager.initialize();
                if (aiInitialized) {
                    Logger.success('✅ AI Manager initialized successfully');
                } else {
                    Logger.error('❌ AI Manager initialization failed');
                }
            } catch (error) {
                Logger.error('❌ Error initializing AI Manager:', error);
            }
        } else {
            Logger.warn('⚠️ AI Manager not found on client');
        }

        Logger.success('🎯 Bot is now listening for messages and learning...');
        Logger.info('💡 Send "!test" in your configured channel to verify functionality');
        Logger.info('🧠 Send "!ai-test" to test AI response generation');
        Logger.info('👋 Mention the bot or reply to its messages to trigger AI responses');
    },
};