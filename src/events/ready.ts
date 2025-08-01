import { Client, Events } from 'discord.js';
import { Logger } from '../utils/logger.js';
import { config } from '../../config/bot.js';

export default {
    name: Events.ClientReady,
    once: true,
    execute(client: Client) {
        Logger.success('Discord AI Chatbot is ready!');
        Logger.info(`Logged in as: ${client.user?.tag}`);
        Logger.info(`Connected to ${client.guilds.cache.size} server(s)`);
        Logger.info(`Serving ${client.users.cache.size} users`);
        
        // Verify configuration
        if (config.listenChannelId) {
            const channel = client.channels.cache.get(config.listenChannelId);
            if (channel) {
                const channelName = 'name' in channel ? channel.name : channel.id;
                Logger.success(`✅ Found target channel: #${channelName}`);
            } else {
                Logger.warn(`⚠️  Target channel not found: ${config.listenChannelId}`);
            }
        } else {
            Logger.warn('⚠️  No LISTEN_CHANNEL_ID configured - bot will listen to all channels');
        }

        // Check voice channel if configured
        if (config.voiceChannelId) {
            const voiceChannel = client.channels.cache.get(config.voiceChannelId);
            if (voiceChannel) {
                const voiceChannelName = 'name' in voiceChannel ? voiceChannel.name : voiceChannel.id;
                Logger.success(`✅ Found voice channel: ${voiceChannelName}`);
            } else {
                Logger.warn(`⚠️  Voice channel not found: ${config.voiceChannelId}`);
            }
        }
        
        // Set bot activity status
        client.user?.setActivity('Learning about server members', { 
            type: 3 // Watching
        });
        
        Logger.success('🎯 Bot is now listening for messages and learning...');
        Logger.info('💡 Send "!test" in your configured channel to verify functionality');
    },
};