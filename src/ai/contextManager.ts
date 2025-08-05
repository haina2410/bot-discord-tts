import { Logger } from '../utils/logger.js';
import type { ProcessedMessage } from '../utils/messageProcessor.js';

export interface UserProfile {
    userId: string;
    username: string;
    displayName?: string;
    interests: string[];
    personality: string[];
    recentTopics: string[];
    interactionCount: number;
    lastSeen: number;
    preferredResponseStyle?: 'casual' | 'formal' | 'friendly' | 'technical';
    timezone?: string;
    language?: string;
}

export interface ChannelContext {
    channelId: string;
    channelName: string;
    channelType: string;
    recentTopics: string[];
    activeUsers: string[];
    conversationTone: 'casual' | 'serious' | 'technical' | 'fun';
    lastActivity: number;
}

export interface MessageContext {
    message: ProcessedMessage;
    userProfile?: UserProfile;
    channelContext: ChannelContext;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: number;
        author?: string;
        topics?: string[];
    }>;
    relevanceScore: number;
    contextualCues: string[];
}

export class ContextManager {
    private userProfiles = new Map<string, UserProfile>();
    private channelContexts = new Map<string, ChannelContext>();

    /**
     * Build comprehensive context for AI response generation
     */
    buildMessageContext(
        message: ProcessedMessage,
        conversationHistory: Array<{
            role: 'user' | 'assistant';
            content: string;
            timestamp: number;
            author?: string;
        }>
    ): MessageContext {
        const userProfile = this.getUserProfile(message.author.id, message.author.username);
        const channelContext = this.getChannelContext(message.channel.id, message.channel.name);
        
        // Extract topics from recent conversation
        const recentTopics = this.extractTopics(conversationHistory);
        
        // Calculate relevance score
        const relevanceScore = this.calculateRelevanceScore(message, userProfile, channelContext);
        
        // Identify contextual cues
        const contextualCues = this.identifyContextualCues(message, conversationHistory);
        
        // Update profiles with new information
        this.updateUserProfile(userProfile, message);
        this.updateChannelContext(channelContext, message);
        
        return {
            message,
            userProfile,
            channelContext,
            conversationHistory: conversationHistory.map(msg => ({
                ...msg,
                topics: this.extractTopicsFromMessage(msg.content)
            })),
            relevanceScore,
            contextualCues,
        };
    }

    /**
     * Get or create user profile
     */
    private getUserProfile(userId: string, username: string): UserProfile {
        let profile = this.userProfiles.get(userId);
        
        if (!profile) {
            profile = {
                userId,
                username,
                interests: [],
                personality: [],
                recentTopics: [],
                interactionCount: 0,
                lastSeen: Date.now(),
            };
            this.userProfiles.set(userId, profile);
            Logger.debug(`📝 Created new user profile for ${username}`);
        }
        
        return profile;
    }

    /**
     * Get or create channel context
     */
    private getChannelContext(channelId: string, channelName: string): ChannelContext {
        let context = this.channelContexts.get(channelId);
        
        if (!context) {
            context = {
                channelId,
                channelName,
                channelType: 'text',
                recentTopics: [],
                activeUsers: [],
                conversationTone: 'casual',
                lastActivity: Date.now(),
            };
            this.channelContexts.set(channelId, context);
            Logger.debug(`📝 Created new channel context for #${channelName}`);
        }
        
        return context;
    }

    /**
     * Extract topics from conversation history
     */
    private extractTopics(conversationHistory: Array<{ content: string }>): string[] {
        const topics = new Set<string>();
        
        for (const message of conversationHistory.slice(-10)) { // Last 10 messages
            const messageTopics = this.extractTopicsFromMessage(message.content);
            messageTopics.forEach(topic => topics.add(topic));
        }
        
        return Array.from(topics);
    }

    /**
     * Extract topics from a single message using keyword analysis
     */
    private extractTopicsFromMessage(content: string): string[] {
        const topics: string[] = [];
        const cleanContent = content.toLowerCase();
        
        // Technology topics
        const techKeywords = ['javascript', 'typescript', 'python', 'react', 'discord', 'bot', 'ai', 'programming', 'code', 'github', 'api'];
        techKeywords.forEach(keyword => {
            if (cleanContent.includes(keyword)) {
                topics.push(`tech:${keyword}`);
            }
        });
        
        // Gaming topics
        const gameKeywords = ['game', 'gaming', 'play', 'steam', 'xbox', 'playstation', 'nintendo'];
        gameKeywords.forEach(keyword => {
            if (cleanContent.includes(keyword)) {
                topics.push(`gaming:${keyword}`);
            }
        });
        
        // General interests
        const interestKeywords = ['music', 'movie', 'book', 'food', 'travel', 'art', 'sport', 'fitness'];
        interestKeywords.forEach(keyword => {
            if (cleanContent.includes(keyword)) {
                topics.push(`interest:${keyword}`);
            }
        });
        
        // Emotions/tone
        const emotionKeywords = ['happy', 'sad', 'excited', 'frustrated', 'confused', 'angry', 'love'];
        emotionKeywords.forEach(keyword => {
            if (cleanContent.includes(keyword)) {
                topics.push(`emotion:${keyword}`);
            }
        });
        
        return topics;
    }

    /**
     * Calculate how relevant the message is for AI response
     */
    private calculateRelevanceScore(
        message: ProcessedMessage,
        userProfile: UserProfile,
        channelContext: ChannelContext
    ): number {
        let score = 0.5; // Base score
        
        // Higher score for mentions and replies
        if (message.messageType === 'mention') score += 0.3;
        if (message.isReply) score += 0.2;
        
        // Higher score for questions
        if (message.cleanContent.includes('?')) score += 0.2;
        
        // Higher score for users we've interacted with before
        if (userProfile.interactionCount > 0) score += 0.1;
        
        // Higher score for recent activity in channel
        const timeSinceLastActivity = Date.now() - channelContext.lastActivity;
        if (timeSinceLastActivity < 300000) score += 0.1; // Within 5 minutes
        
        // Lower score for very short messages
        if (message.cleanContent.length < 10) score -= 0.2;
        
        // Higher score for messages with common interests
        const messageTopics = this.extractTopicsFromMessage(message.cleanContent);
        const commonTopics = messageTopics.filter(topic => 
            userProfile.recentTopics.includes(topic) || 
            channelContext.recentTopics.includes(topic)
        );
        score += commonTopics.length * 0.1;
        
        return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
    }

    /**
     * Identify contextual cues that should influence the response
     */
    private identifyContextualCues(
        message: ProcessedMessage,
        conversationHistory: Array<{ content: string; author?: string }>
    ): string[] {
        const cues: string[] = [];
        
        // Time-based cues
        const hour = new Date().getHours();
        if (hour < 6 || hour > 22) cues.push('late-night');
        if (hour >= 6 && hour < 12) cues.push('morning');
        if (hour >= 12 && hour < 17) cues.push('afternoon');
        if (hour >= 17 && hour < 22) cues.push('evening');
        
        // Message type cues
        if (message.messageType === 'mention') cues.push('mentioned');
        if (message.isReply) cues.push('reply');
        
        // Content cues
        const content = message.cleanContent.toLowerCase();
        if (content.includes('help') || content.includes('?')) cues.push('needs-help');
        if (content.includes('thanks') || content.includes('thank')) cues.push('grateful');
        if (content.includes('hello') || content.includes('hi')) cues.push('greeting');
        if (content.includes('bye') || content.includes('goodbye')) cues.push('farewell');
        
        // Conversation flow cues
        if (conversationHistory.length === 0) cues.push('first-interaction');
        if (conversationHistory.length > 5) cues.push('ongoing-conversation');
        
        // Recent context cues
        const recentMessages = conversationHistory.slice(-3);
        if (recentMessages.some(msg => msg.author === message.author.username)) {
            cues.push('continuing-user');
        }
        
        return cues;
    }

    /**
     * Update user profile with new interaction data
     */
    private updateUserProfile(profile: UserProfile, message: ProcessedMessage) {
        profile.interactionCount++;
        profile.lastSeen = message.timestamp;
        profile.username = message.author.username; // Update in case of username change
        
        // Extract and add topics to recent topics
        const messageTopics = this.extractTopicsFromMessage(message.cleanContent);
        messageTopics.forEach(topic => {
            if (!profile.recentTopics.includes(topic)) {
                profile.recentTopics.push(topic);
            }
        });
        
        // Keep only last 20 topics
        profile.recentTopics = profile.recentTopics.slice(-20);
        
        // Update personality traits based on message patterns
        this.updatePersonalityTraits(profile, message);
    }

    /**
     * Update personality traits based on message analysis
     */
    private updatePersonalityTraits(profile: UserProfile, message: ProcessedMessage) {
        const content = message.cleanContent.toLowerCase();
        
        // Detect personality traits
        if (content.includes('lol') || content.includes('haha') || content.includes('😂')) {
            this.addPersonalityTrait(profile, 'humorous');
        }
        
        if (content.includes('?') && content.length > 20) {
            this.addPersonalityTrait(profile, 'inquisitive');
        }
        
        if (content.includes('please') || content.includes('thank')) {
            this.addPersonalityTrait(profile, 'polite');
        }
        
        if (content.includes('code') || content.includes('programming') || content.includes('tech')) {
            this.addPersonalityTrait(profile, 'technical');
        }
    }

    /**
     * Add personality trait if not already present
     */
    private addPersonalityTrait(profile: UserProfile, trait: string) {
        if (!profile.personality.includes(trait)) {
            profile.personality.push(trait);
            // Keep only last 10 traits
            profile.personality = profile.personality.slice(-10);
        }
    }

    /**
     * Update channel context with new message data
     */
    private updateChannelContext(context: ChannelContext, message: ProcessedMessage) {
        context.lastActivity = message.timestamp;
        
        // Add user to active users
        if (!context.activeUsers.includes(message.author.id)) {
            context.activeUsers.push(message.author.id);
        }
        
        // Keep only last 20 active users
        context.activeUsers = context.activeUsers.slice(-20);
        
        // Update recent topics
        const messageTopics = this.extractTopicsFromMessage(message.cleanContent);
        messageTopics.forEach(topic => {
            if (!context.recentTopics.includes(topic)) {
                context.recentTopics.push(topic);
            }
        });
        
        // Keep only last 15 topics
        context.recentTopics = context.recentTopics.slice(-15);
    }

    /**
     * Get context summary for AI prompt
     */
    getContextSummary(context: MessageContext): string {
        const parts: string[] = [];
        
        if (context.userProfile) {
            const profile = context.userProfile;
            parts.push(`User ${profile.username} (${profile.interactionCount} interactions)`);
            
            if (profile.personality.length > 0) {
                parts.push(`Personality: ${profile.personality.join(', ')}`);
            }
            
            if (profile.recentTopics.length > 0) {
                const topics = profile.recentTopics.slice(-5).join(', ');
                parts.push(`Recent interests: ${topics}`);
            }
        }
        
        if (context.channelContext.recentTopics.length > 0) {
            const topics = context.channelContext.recentTopics.slice(-3).join(', ');
            parts.push(`Channel topics: ${topics}`);
        }
        
        if (context.contextualCues.length > 0) {
            parts.push(`Context: ${context.contextualCues.join(', ')}`);
        }
        
        parts.push(`Relevance: ${Math.round(context.relevanceScore * 100)}%`);
        
        return parts.join(' | ');
    }

    /**
     * Check if response should be generated based on relevance
     */
    shouldGenerateResponse(context: MessageContext, threshold: number = 0.6): boolean {
        // Always respond to mentions and direct replies
        if (context.message.messageType === 'mention' || context.message.isReply) {
            return true;
        }
        
        // Respond based on relevance score and provided threshold
        return context.relevanceScore > threshold;
    }

    /**
     * Get statistics about context management
     */
    getStats() {
        return {
            userProfiles: this.userProfiles.size,
            channelContexts: this.channelContexts.size,
            totalInteractions: Array.from(this.userProfiles.values())
                .reduce((sum, profile) => sum + profile.interactionCount, 0),
        };
    }

    /**
     * Clear old data to manage memory
     */
    cleanup() {
        const now = Date.now();
        const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
        
        // Remove old user profiles
        for (const [userId, profile] of this.userProfiles.entries()) {
            if (profile.lastSeen < oneWeekAgo) {
                this.userProfiles.delete(userId);
            }
        }
        
        // Remove old channel contexts
        for (const [channelId, context] of this.channelContexts.entries()) {
            if (context.lastActivity < oneWeekAgo) {
                this.channelContexts.delete(channelId);
            }
        }
        
        Logger.info(`🧹 Context cleanup completed. ${this.userProfiles.size} users, ${this.channelContexts.size} channels`);
    }
}