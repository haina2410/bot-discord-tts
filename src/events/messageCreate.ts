import { Events, Message } from 'discord.js';
import { Logger } from '../utils/logger.js';
import { ChannelManager } from '../utils/channelManager.js';
import { MessageProcessor } from '../utils/messageProcessor.js';
import { CommandHandler } from '../utils/commandHandler.js';
import { AIManager } from '../ai/aiManager.js';

// Global instances (will be set by main bot)
let channelManager: ChannelManager;
let messageProcessor: MessageProcessor;
let commandHandler: CommandHandler;
let aiManager: AIManager;

export function setChannelManager(manager: ChannelManager) {
    channelManager = manager;
}

export function setMessageProcessor(processor: MessageProcessor) {
    messageProcessor = processor;
}

export function setCommandHandler(handler: CommandHandler) {
    commandHandler = handler;
}

export function setAIManager(manager: AIManager) {
    aiManager = manager;
}

export default {
    name: Events.MessageCreate,
    async execute(message: Message) {
        // Ignore messages from bots
        if (message.author.bot) return;
        
        // Check if we should listen to this channel
        if (channelManager && !channelManager.shouldListenToChannel(message.channel.id)) {
            return;
        }

        const channelInfo = channelManager 
            ? channelManager.getChannelInfo(message.channel)
            : { name: 'Unknown', type: 'Unknown', isListening: true };
        
        // Process message with enhanced processor
        if (!messageProcessor) {
            Logger.warn('Message processor not initialized, using basic logging');
            Logger.info(`📨 Message from ${message.author.tag} in #${channelInfo.name}: ${message.content}`);
            return;
        }

        const processedMessage = messageProcessor.processMessage(message, channelInfo);
        messageProcessor.logMessage(processedMessage);

        // Handle commands
        if (processedMessage.messageType === 'command' && commandHandler) {
            const handled = await commandHandler.handleCommand(message);
            if (handled) {
                return; // Command was handled, no further processing needed
            }
        }

        // Handle mentions and AI-worthy messages
        if (messageProcessor.shouldTriggerAI(processedMessage)) {
            Logger.info('🧠 Message should trigger AI response');
            
            if (aiManager) {
                try {
                    // Generate AI response
                    const aiResponse = await aiManager.processMessage(processedMessage, message);
                    
                    if (aiResponse) {
                        // Send AI response
                        await message.reply(aiResponse);
                        Logger.success(`✅ AI response sent to ${message.author.tag}`);
                    }
                } catch (error) {
                    Logger.error('❌ Error processing AI response:', error);
                    // Send fallback response
                    await message.reply("I'm having trouble thinking right now, but I'm here and listening! 🤖");
                }
            } else {
                Logger.warn('⚠️ AI Manager not initialized, cannot process AI response');
            }
        }

        // TODO: Store user data in database (will be implemented in Task 6-7)
        
        // Log the structured data for debugging
        Logger.debug('📊 Processed message data:', processedMessage);
    },
};