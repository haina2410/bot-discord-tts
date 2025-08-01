import { Message } from 'discord.js';
import { OpenAIService, type ConversationContext, type AIResponse } from './openaiService.js';
import { Logger } from '../utils/logger.js';
import type { ProcessedMessage } from '../utils/messageProcessor.js';

export class AIManager {
    private openaiService: OpenAIService;
    private conversationHistory = new Map<string, Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: number;
        author?: string;
    }>>();

    constructor() {
        this.openaiService = new OpenAIService();
    }

    /**
     * Initialize the AI manager and test connections
     */
    async initialize(): Promise<boolean> {
        Logger.info('🤖 Initializing AI Manager...');
        
        try {
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
            // Build conversation context
            const context = this.buildConversationContext(processedMessage);
            
            // Generate AI response
            const aiResponse = await this.openaiService.generateResponse(processedMessage, context);
            
            // Store the conversation in history
            this.addToConversationHistory(processedMessage, aiResponse);
            
            // Log the interaction
            this.logInteraction(processedMessage, aiResponse);
            
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
    private buildConversationContext(message: ProcessedMessage): ConversationContext {
        const conversationKey = `${message.guild.id}-${message.channel.id}`;
        const recentMessages = this.conversationHistory.get(conversationKey) || [];

        return {
            userId: message.author.id,
            username: message.author.username,
            channelId: message.channel.id,
            channelName: message.channel.name,
            guildId: message.guild.id,
            guildName: message.guild.name,
            recentMessages,
            // TODO: Add user context from database (Task 6-7)
            userContext: undefined,
        };
    }

    /**
     * Add interaction to conversation history
     */
    private addToConversationHistory(message: ProcessedMessage, aiResponse: AIResponse) {
        const conversationKey = `${message.guild.id}-${message.channel.id}`;
        const history = this.conversationHistory.get(conversationKey) || [];

        // Add user message
        history.push({
            role: 'user',
            content: message.cleanContent,
            timestamp: message.timestamp,
            author: message.author.username,
        });

        // Add AI response
        history.push({
            role: 'assistant',
            content: aiResponse.content,
            timestamp: Date.now(),
        });

        // Keep only last 20 messages to manage memory
        const trimmedHistory = history.slice(-20);
        this.conversationHistory.set(conversationKey, trimmedHistory);
    }

    /**
     * Log the AI interaction for monitoring
     */
    private logInteraction(message: ProcessedMessage, aiResponse: AIResponse) {
        Logger.info(`🤖 AI Interaction Summary:`);
        Logger.info(`   User: ${message.author.username} in #${message.channel.name}`);
        Logger.info(`   Input: ${message.cleanContent.substring(0, 100)}${message.cleanContent.length > 100 ? '...' : ''}`);
        Logger.info(`   Output: ${aiResponse.content.substring(0, 100)}${aiResponse.content.length > 100 ? '...' : ''}`);
        
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
    clearChannelHistory(guildId: string, channelId: string) {
        const conversationKey = `${guildId}-${channelId}`;
        this.conversationHistory.delete(conversationKey);
        Logger.info(`🗑️ Cleared conversation history for channel ${channelId}`);
    }

    /**
     * Get conversation statistics
     */
    getStats() {
        const totalConversations = this.conversationHistory.size;
        let totalMessages = 0;
        
        this.conversationHistory.forEach(history => {
            totalMessages += history.length;
        });

        return {
            totalConversations,
            totalMessages,
            averageMessagesPerConversation: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0,
            modelInfo: this.openaiService.getModelInfo(),
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
}