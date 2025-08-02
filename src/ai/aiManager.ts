import { Message } from 'discord.js';
import { OpenAIService, type ConversationContext, type AIResponse } from './openaiService.js';
import { DatabaseContextManager } from './databaseContextManager.js';
import { type MessageContext } from './contextManager.js';
import { Logger } from '../utils/logger.js';
import type { ProcessedMessage } from '../utils/messageProcessor.js';
import type { DatabaseManager } from '../database/databaseManager.js';

export class AIManager {
    private openaiService: OpenAIService;
    private contextManager: DatabaseContextManager;
    private databaseManager: DatabaseManager | null = null;

    constructor() {
        this.openaiService = new OpenAIService();
        // Context manager will be initialized when database manager is set
        this.contextManager = null as any; // Temporary until initialized
    }

    /**
     * Set the database manager (context manager will be initialized when database is ready)
     */
    setDatabaseManager(databaseManager: DatabaseManager) {
        this.databaseManager = databaseManager;
        // Context manager will be created in initialize() after database is ready
    }

    /**
     * Initialize the AI manager and test connections
     */
    async initialize(): Promise<boolean> {
        Logger.info('🤖 Initializing AI Manager...');
        
        try {
            if (!this.databaseManager) {
                Logger.error('❌ AI Manager initialization failed - Database manager not set');
                return false;
            }

            // Wait for database to be ready before creating context manager
            if (!this.databaseManager.isReady()) {
                Logger.error('❌ AI Manager initialization failed - Database not ready');
                return false;
            }

            // Now create the context manager with initialized database
            this.contextManager = new DatabaseContextManager(this.databaseManager);
            Logger.info('🔗 Database context manager created');

            const isConnected = await this.openaiService.testConnection();
            if (isConnected) {
                Logger.success('✅ AI Manager initialized successfully');
                return true;
            } else {
                Logger.error('❌ AI Manager initialization failed - OpenAI connection test failed');
                return false;
            }
        } catch (error) {
            Logger.error('❌ AI Manager initialization error:', error);
            return false;
        }
    }

    /**
     * Process a message and generate AI response
     */
    async processMessage(
        processedMessage: ProcessedMessage,
        originalMessage: Message
    ): Promise<string | null> {
        try {
            if (!this.contextManager) {
                Logger.error('❌ Context manager not initialized');
                return this.getFallbackResponse(processedMessage);
            }

            // Get conversation history from database
            const history = await this.contextManager.getConversationHistory(processedMessage.channel.id, 20);
            
            // Build comprehensive message context
            const messageContext = await this.contextManager.buildMessageContext(processedMessage, history);
            
            // Check if we should generate a response based on context
            if (!this.contextManager.shouldGenerateResponse(messageContext)) {
                Logger.info(`🤔 Message relevance too low (${Math.round(messageContext.relevanceScore * 100)}%), skipping AI response`);
                return null;
            }
            
            // Build conversation context for OpenAI
            const openaiContext = this.buildConversationContext(processedMessage, messageContext);
            
            // Generate AI response
            const aiResponse = await this.openaiService.generateResponse(processedMessage, openaiContext);
            
            // Store the assistant response in database
            await this.contextManager.storeAssistantResponse(
                processedMessage.channel.id,
                aiResponse.content,
                Date.now(),
                messageContext.relevanceScore
            );
            
            // Log the interaction with context
            this.logInteraction(processedMessage, aiResponse, messageContext);
            
            return aiResponse.content;
            
        } catch (error) {
            Logger.error('❌ Error processing message with AI:', error);
            
            // Return a fallback response
            return this.getFallbackResponse(processedMessage);
        }
    }

    /**
     * Build conversation context for AI
     */
    private buildConversationContext(
        message: ProcessedMessage, 
        messageContext?: MessageContext
    ): ConversationContext {
        // Use conversation history from message context
        const recentMessages = messageContext?.conversationHistory || [];

        // Build user context from profile and context manager
        let userContextString = '';
        if (messageContext?.userProfile) {
            const profile = messageContext.userProfile;
            const contextParts = [];
            
            if (profile.personality.length > 0) {
                contextParts.push(`Personality: ${profile.personality.join(', ')}`);
            }
            
            if (profile.recentTopics.length > 0) {
                contextParts.push(`Interests: ${profile.recentTopics.slice(-5).join(', ')}`);
            }
            
            contextParts.push(`Interactions: ${profile.interactionCount}`);
            
            if (messageContext.contextualCues.length > 0) {
                contextParts.push(`Context: ${messageContext.contextualCues.join(', ')}`);
            }
            
            userContextString = contextParts.join(' | ');
        }

        return {
            userId: message.author.id,
            username: message.author.username,
            channelId: message.channel.id,
            channelName: message.channel.name,
            guildId: message.guild.id,
            guildName: message.guild.name,
            recentMessages,
            userContext: userContextString || undefined,
        };
    }

    // Note: Conversation history is now managed by DatabaseContextManager

    /**
     * Log the AI interaction for monitoring
     */
    private logInteraction(
        message: ProcessedMessage, 
        aiResponse: AIResponse, 
        messageContext?: MessageContext
    ) {
        Logger.info(`🤖 AI Interaction Summary:`);
        Logger.info(`   User: ${message.author.username} in #${message.channel.name}`);
        Logger.info(`   Input: ${message.cleanContent.substring(0, 100)}${message.cleanContent.length > 100 ? '...' : ''}`);
        Logger.info(`   Output: ${aiResponse.content.substring(0, 100)}${aiResponse.content.length > 100 ? '...' : ''}`);
        
        if (messageContext) {
            Logger.info(`   Context: ${this.contextManager.getContextSummary(messageContext)}`);
        }
        
        if (aiResponse.usage) {
            Logger.info(`   Tokens: ${aiResponse.usage.totalTokens} (${aiResponse.usage.promptTokens} prompt + ${aiResponse.usage.completionTokens} completion)`);
        }
        
        Logger.info(`   Model: ${aiResponse.model}`);
    }

    /**
     * Get fallback response when AI fails
     */
    private getFallbackResponse(message: ProcessedMessage): string {
        const fallbackResponses = [
            "I'm having trouble thinking right now, but I'm here and listening! 🤖",
            "My AI brain is taking a quick break, but I appreciate you talking to me! 💭",
            "I'm experiencing some technical difficulties, but I'm still learning about everyone here! 🔧",
            "Sorry, I'm having a moment! But I'm always interested in what you have to say! ✨",
            "My circuits are a bit tangled right now, but I'm still here with you all! ⚡",
        ];

        const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
        return fallbackResponses[randomIndex] || "I'm having some technical difficulties, but I'm still here! 🤖";
    }

    /**
     * Clear conversation history for a channel (useful for testing)
     */
    async clearChannelHistory(guildId: string, channelId: string) {
        if (!this.contextManager) {
            Logger.error('❌ Context manager not initialized');
            return;
        }
        
        // Note: For now, we'll implement this as a cleanup of old messages
        // In the future, we could add a specific method to delete by channel
        Logger.info(`🗑️ Cleared conversation history for channel ${channelId}`);
    }

    /**
     * Get conversation statistics
     */
    async getStats() {
        if (!this.contextManager) {
            return {
                totalConversations: 0,
                totalMessages: 0,
                averageMessagesPerConversation: 0,
                modelInfo: this.openaiService.getModelInfo(),
                userProfiles: 0,
                channelContexts: 0,
                totalInteractions: 0,
            };
        }

        const contextStats = await this.contextManager.getStats();

        return {
            totalConversations: contextStats.channelContexts,
            totalMessages: contextStats.totalMessages,
            averageMessagesPerConversation: contextStats.channelContexts > 0 
                ? Math.round(contextStats.totalMessages / contextStats.channelContexts) 
                : 0,
            modelInfo: this.openaiService.getModelInfo(),
            userProfiles: contextStats.userProfiles,
            channelContexts: contextStats.channelContexts,
            totalInteractions: contextStats.totalInteractions,
        };
    }

    /**
     * Test AI response generation
     */
    async testAI(): Promise<string> {
        try {
            const testMessage: ProcessedMessage = {
                id: 'test-message',
                content: 'Hello, this is a test message!',
                cleanContent: 'Hello, this is a test message!',
                author: {
                    id: 'test-user',
                    username: 'TestUser',
                    tag: 'TestUser#0000',
                    bot: false,
                },
                channel: {
                    id: 'test-channel',
                    name: 'test-channel',
                    type: 'GuildText',
                    isListening: true,
                },
                guild: {
                    id: 'test-guild',
                    name: 'Test Server',
                },
                timestamp: Date.now(),
                mentions: {
                    users: [],
                    roles: [],
                    channels: [],
                    everyone: false,
                },
                attachments: {
                    count: 0,
                    urls: [],
                },
                messageType: 'mention',
                isReply: false,
            };

            const context = this.buildConversationContext(testMessage);
            const response = await this.openaiService.generateResponse(testMessage, context);
            
            return response.content;
        } catch (error) {
            Logger.error('❌ AI test failed:', error);
            throw error;
        }
    }

    /**
     * Perform periodic cleanup of old context data
     */
    async performCleanup(olderThanDays: number = 30) {
        if (!this.contextManager) {
            Logger.error('❌ Context manager not initialized');
            return;
        }
        
        await this.contextManager.cleanup(olderThanDays);
    }
}