import Database from 'better-sqlite3';
import { Logger } from '../utils/logger.js';
import type { UserProfile, ChannelContext } from '../ai/contextManager.js';

export interface ConversationMessage {
    id?: number;
    channelId: string;
    userId?: string | null;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    author?: string;
    relevanceScore?: number;
}

export interface DatabaseOperations {
    // User Profile Operations
    createUserProfile(profile: UserProfile): Promise<boolean>;
    getUserProfile(userId: string): Promise<UserProfile | null>;
    updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean>;
    deleteUserProfile(userId: string): Promise<boolean>;
    getAllUserProfiles(): Promise<UserProfile[]>;

    // Channel Context Operations  
    createChannelContext(context: ChannelContext): Promise<boolean>;
    getChannelContext(channelId: string): Promise<ChannelContext | null>;
    updateChannelContext(channelId: string, updates: Partial<ChannelContext>): Promise<boolean>;
    deleteChannelContext(channelId: string): Promise<boolean>;
    getAllChannelContexts(): Promise<ChannelContext[]>;

    // Conversation History Operations
    addConversationMessage(message: ConversationMessage): Promise<number | null>;
    getConversationHistory(channelId: string, limit?: number): Promise<ConversationMessage[]>;
    deleteOldConversationHistory(olderThanDays: number): Promise<number>;

    // User Interest Operations
    addUserInterest(userId: string, interest: string, weight?: number): Promise<boolean>;
    getUserInterests(userId: string): Promise<string[]>;
    removeUserInterest(userId: string, interest: string): Promise<boolean>;
    updateUserInterestWeight(userId: string, interest: string, weight: number): Promise<boolean>;

    // User Personality Operations
    addPersonalityTrait(userId: string, trait: string, confidence?: number): Promise<boolean>;
    getPersonalityTraits(userId: string): Promise<string[]>;
    removePersonalityTrait(userId: string, trait: string): Promise<boolean>;

    // Topic Management
    addUserRecentTopic(userId: string, topic: string, relevance?: number): Promise<boolean>;
    getUserRecentTopics(userId: string, limit?: number): Promise<string[]>;
    addChannelRecentTopic(channelId: string, topic: string, relevance?: number): Promise<boolean>;
    getChannelRecentTopics(channelId: string, limit?: number): Promise<string[]>;
    cleanupOldTopics(olderThanDays: number): Promise<number>;

    // Channel Active Users
    addChannelActiveUser(channelId: string, userId: string): Promise<boolean>;
    getChannelActiveUsers(channelId: string, activeWithinHours?: number): Promise<string[]>;
    updateUserActivity(channelId: string, userId: string): Promise<boolean>;

    // Utility Operations
    getUserStats(userId: string): Promise<any>;
    getChannelStats(channelId: string): Promise<any>;
    getDatabaseStats(): Promise<any>;
    cleanupOldData(olderThanDays: number): Promise<void>;
}

export class DatabaseCRUD implements DatabaseOperations {
    private db: Database.Database;

    constructor(database: Database.Database) {
        this.db = database;
        this.prepareCachedStatements();
    }

    // Prepared statements for better performance
    private statements: Record<string, Database.Statement> = {};

    private prepareCachedStatements() {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            // User Profile statements
            this.statements.insertUserProfile = this.db.prepare(`
                INSERT OR REPLACE INTO user_profiles 
                (user_id, username, display_name, interaction_count, last_seen, 
                 preferred_response_style, timezone, language)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            this.statements.getUserProfile = this.db.prepare(`
                SELECT * FROM user_profiles WHERE user_id = ?
            `);

            this.statements.updateUserProfile = this.db.prepare(`
                UPDATE user_profiles 
                SET username = ?, display_name = ?, interaction_count = ?, 
                    last_seen = ?, preferred_response_style = ?, timezone = ?, language = ?
                WHERE user_id = ?
            `);

            this.statements.deleteUserProfile = this.db.prepare(`
                DELETE FROM user_profiles WHERE user_id = ?
            `);

            this.statements.getAllUserProfiles = this.db.prepare(`
                SELECT * FROM user_profiles ORDER BY last_seen DESC
            `);

            // Channel Context statements
            this.statements.insertChannelContext = this.db.prepare(`
                INSERT OR REPLACE INTO channel_contexts 
                (channel_id, channel_name, channel_type, conversation_tone, last_activity)
                VALUES (?, ?, ?, ?, ?)
            `);

            this.statements.getChannelContext = this.db.prepare(`
                SELECT * FROM channel_contexts WHERE channel_id = ?
            `);

            this.statements.updateChannelContext = this.db.prepare(`
                UPDATE channel_contexts 
                SET channel_name = ?, channel_type = ?, conversation_tone = ?, last_activity = ?
                WHERE channel_id = ?
            `);

            this.statements.deleteChannelContext = this.db.prepare(`
                DELETE FROM channel_contexts WHERE channel_id = ?
            `);

            this.statements.getAllChannelContexts = this.db.prepare(`
                SELECT * FROM channel_contexts ORDER BY last_activity DESC
            `);

            // Conversation History statements
            this.statements.insertConversationMessage = this.db.prepare(`
                INSERT INTO conversation_history 
                (channel_id, user_id, role, content, timestamp, author, relevance_score)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            this.statements.getConversationHistory = this.db.prepare(`
                SELECT * FROM conversation_history 
                WHERE channel_id = ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            `);

            // User Interest statements
            this.statements.insertUserInterest = this.db.prepare(`
                INSERT OR REPLACE INTO user_interests 
                (user_id, interest, weight, last_mentioned, mention_count)
                VALUES (?, ?, ?, strftime('%s', 'now'), 
                        COALESCE((SELECT mention_count FROM user_interests WHERE user_id = ? AND interest = ?), 0) + 1)
            `);

            this.statements.getUserInterests = this.db.prepare(`
                SELECT interest FROM user_interests 
                WHERE user_id = ? 
                ORDER BY last_mentioned DESC
            `);

            this.statements.deleteUserInterest = this.db.prepare(`
                DELETE FROM user_interests WHERE user_id = ? AND interest = ?
            `);

            // Personality Trait statements
            this.statements.insertPersonalityTrait = this.db.prepare(`
                INSERT OR REPLACE INTO user_personality_traits 
                (user_id, trait, confidence, last_observed, observation_count)
                VALUES (?, ?, ?, strftime('%s', 'now'),
                        COALESCE((SELECT observation_count FROM user_personality_traits WHERE user_id = ? AND trait = ?), 0) + 1)
            `);

            this.statements.getPersonalityTraits = this.db.prepare(`
                SELECT trait FROM user_personality_traits 
                WHERE user_id = ? 
                ORDER BY last_observed DESC
            `);

            this.statements.deletePersonalityTrait = this.db.prepare(`
                DELETE FROM user_personality_traits WHERE user_id = ? AND trait = ?
            `);

            // Recent Topics statements
            this.statements.insertUserRecentTopic = this.db.prepare(`
                INSERT OR REPLACE INTO user_recent_topics 
                (user_id, topic, relevance, mentioned_at)
                VALUES (?, ?, ?, strftime('%s', 'now'))
            `);

            this.statements.getUserRecentTopics = this.db.prepare(`
                SELECT topic FROM user_recent_topics 
                WHERE user_id = ? 
                ORDER BY mentioned_at DESC 
                LIMIT ?
            `);

            this.statements.insertChannelRecentTopic = this.db.prepare(`
                INSERT OR REPLACE INTO channel_recent_topics 
                (channel_id, topic, relevance, mentioned_at)
                VALUES (?, ?, ?, strftime('%s', 'now'))
            `);

            this.statements.getChannelRecentTopics = this.db.prepare(`
                SELECT topic FROM channel_recent_topics 
                WHERE channel_id = ? 
                ORDER BY mentioned_at DESC 
                LIMIT ?
            `);

            // Channel Active Users statements
            this.statements.insertChannelActiveUser = this.db.prepare(`
                INSERT OR REPLACE INTO channel_active_users 
                (channel_id, user_id, last_active, activity_count)
                VALUES (?, ?, strftime('%s', 'now'),
                        COALESCE((SELECT activity_count FROM channel_active_users WHERE channel_id = ? AND user_id = ?), 0) + 1)
            `);

            this.statements.getChannelActiveUsers = this.db.prepare(`
                SELECT user_id FROM channel_active_users 
                WHERE channel_id = ? AND last_active > (strftime('%s', 'now') - ?)
                ORDER BY last_active DESC
            `);

            Logger.info('✅ Database CRUD statements prepared successfully');

        } catch (error) {
            Logger.error('❌ Failed to prepare database statements:', error);
            throw error;
        }
    }

    // =============================================================================
    // USER PROFILE OPERATIONS
    // =============================================================================

    async createUserProfile(profile: UserProfile): Promise<boolean> {
        try {
            this.statements.insertUserProfile.run(
                profile.userId,
                profile.username,
                profile.displayName || null,
                profile.interactionCount,
                profile.lastSeen,
                profile.preferredResponseStyle || null,
                profile.timezone || null,
                profile.language || null
            );

            // Insert interests
            for (const interest of profile.interests) {
                await this.addUserInterest(profile.userId, interest);
            }

            // Insert personality traits
            for (const trait of profile.personality) {
                await this.addPersonalityTrait(profile.userId, trait);
            }

            // Insert recent topics
            for (const topic of profile.recentTopics) {
                await this.addUserRecentTopic(profile.userId, topic);
            }

            Logger.debug(`✅ Created user profile for ${profile.username}`);
            return true;

        } catch (error) {
            Logger.error('❌ Failed to create user profile:', error);
            return false;
        }
    }

    async getUserProfile(userId: string): Promise<UserProfile | null> {
        try {
            const profileRow = this.statements.getUserProfile.get(userId) as any;
            if (!profileRow) return null;

            // Get related data
            const interests = await this.getUserInterests(userId);
            const personality = await this.getPersonalityTraits(userId);
            const recentTopics = await this.getUserRecentTopics(userId, 20);

            const profile: UserProfile = {
                userId: profileRow.user_id,
                username: profileRow.username,
                displayName: profileRow.display_name,
                interests,
                personality,
                recentTopics,
                interactionCount: profileRow.interaction_count,
                lastSeen: profileRow.last_seen,
                preferredResponseStyle: profileRow.preferred_response_style,
                timezone: profileRow.timezone,
                language: profileRow.language
            };

            return profile;

        } catch (error) {
            Logger.error('❌ Failed to get user profile:', error);
            return null;
        }
    }

    async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
        try {
            // Get current profile to merge updates
            const current = await this.getUserProfile(userId);
            if (!current) return false;

            const updated = { ...current, ...updates };

            this.statements.updateUserProfile.run(
                updated.username,
                updated.displayName || null,
                updated.interactionCount,
                updated.lastSeen,
                updated.preferredResponseStyle || null,
                updated.timezone || null,
                updated.language || null,
                userId
            );

            // Update interests if provided
            if (updates.interests) {
                // Clear existing interests and add new ones
                this.db.prepare('DELETE FROM user_interests WHERE user_id = ?').run(userId);
                for (const interest of updates.interests) {
                    await this.addUserInterest(userId, interest);
                }
            }

            // Update personality traits if provided
            if (updates.personality) {
                this.db.prepare('DELETE FROM user_personality_traits WHERE user_id = ?').run(userId);
                for (const trait of updates.personality) {
                    await this.addPersonalityTrait(userId, trait);
                }
            }

            // Update recent topics if provided
            if (updates.recentTopics) {
                this.db.prepare('DELETE FROM user_recent_topics WHERE user_id = ?').run(userId);
                for (const topic of updates.recentTopics) {
                    await this.addUserRecentTopic(userId, topic);
                }
            }

            Logger.debug(`✅ Updated user profile for ${updated.username}`);
            return true;

        } catch (error) {
            Logger.error('❌ Failed to update user profile:', error);
            return false;
        }
    }

    async deleteUserProfile(userId: string): Promise<boolean> {
        try {
            const result = this.statements.deleteUserProfile.run(userId);
            const deleted = result.changes > 0;
            
            if (deleted) {
                Logger.debug(`✅ Deleted user profile for ${userId}`);
            }
            
            return deleted;

        } catch (error) {
            Logger.error('❌ Failed to delete user profile:', error);
            return false;
        }
    }

    async getAllUserProfiles(): Promise<UserProfile[]> {
        try {
            const profileRows = this.statements.getAllUserProfiles.all() as any[];
            const profiles: UserProfile[] = [];

            for (const row of profileRows) {
                const interests = await this.getUserInterests(row.user_id);
                const personality = await this.getPersonalityTraits(row.user_id);
                const recentTopics = await this.getUserRecentTopics(row.user_id, 20);

                profiles.push({
                    userId: row.user_id,
                    username: row.username,
                    displayName: row.display_name,
                    interests,
                    personality,
                    recentTopics,
                    interactionCount: row.interaction_count,
                    lastSeen: row.last_seen,
                    preferredResponseStyle: row.preferred_response_style,
                    timezone: row.timezone,
                    language: row.language
                });
            }

            return profiles;

        } catch (error) {
            Logger.error('❌ Failed to get all user profiles:', error);
            return [];
        }
    }

    // =============================================================================
    // CHANNEL CONTEXT OPERATIONS
    // =============================================================================

    async createChannelContext(context: ChannelContext): Promise<boolean> {
        try {
            this.statements.insertChannelContext.run(
                context.channelId,
                context.channelName,
                context.channelType,
                context.conversationTone,
                context.lastActivity
            );

            // Insert recent topics
            for (const topic of context.recentTopics) {
                await this.addChannelRecentTopic(context.channelId, topic);
            }

            // Insert active users
            for (const userId of context.activeUsers) {
                await this.addChannelActiveUser(context.channelId, userId);
            }

            Logger.debug(`✅ Created channel context for #${context.channelName}`);
            return true;

        } catch (error) {
            Logger.error('❌ Failed to create channel context:', error);
            return false;
        }
    }

    async getChannelContext(channelId: string): Promise<ChannelContext | null> {
        try {
            const contextRow = this.statements.getChannelContext.get(channelId) as any;
            if (!contextRow) return null;

            // Get related data
            const recentTopics = await this.getChannelRecentTopics(channelId, 15);
            const activeUsers = await this.getChannelActiveUsers(channelId, 24); // Active within 24 hours

            const context: ChannelContext = {
                channelId: contextRow.channel_id,
                channelName: contextRow.channel_name,
                channelType: contextRow.channel_type,
                recentTopics,
                activeUsers,
                conversationTone: contextRow.conversation_tone,
                lastActivity: contextRow.last_activity
            };

            return context;

        } catch (error) {
            Logger.error('❌ Failed to get channel context:', error);
            return null;
        }
    }

    async updateChannelContext(channelId: string, updates: Partial<ChannelContext>): Promise<boolean> {
        try {
            // Get current context to merge updates
            const current = await this.getChannelContext(channelId);
            if (!current) return false;

            const updated = { ...current, ...updates };

            this.statements.updateChannelContext.run(
                updated.channelName,
                updated.channelType,
                updated.conversationTone,
                updated.lastActivity,
                channelId
            );

            // Update recent topics if provided
            if (updates.recentTopics) {
                this.db.prepare('DELETE FROM channel_recent_topics WHERE channel_id = ?').run(channelId);
                for (const topic of updates.recentTopics) {
                    await this.addChannelRecentTopic(channelId, topic);
                }
            }

            // Update active users if provided
            if (updates.activeUsers) {
                this.db.prepare('DELETE FROM channel_active_users WHERE channel_id = ?').run(channelId);
                for (const userId of updates.activeUsers) {
                    await this.addChannelActiveUser(channelId, userId);
                }
            }

            Logger.debug(`✅ Updated channel context for #${updated.channelName}`);
            return true;

        } catch (error) {
            Logger.error('❌ Failed to update channel context:', error);
            return false;
        }
    }

    async deleteChannelContext(channelId: string): Promise<boolean> {
        try {
            const result = this.statements.deleteChannelContext.run(channelId);
            const deleted = result.changes > 0;
            
            if (deleted) {
                Logger.debug(`✅ Deleted channel context for ${channelId}`);
            }
            
            return deleted;

        } catch (error) {
            Logger.error('❌ Failed to delete channel context:', error);
            return false;
        }
    }

    async getAllChannelContexts(): Promise<ChannelContext[]> {
        try {
            const contextRows = this.statements.getAllChannelContexts.all() as any[];
            const contexts: ChannelContext[] = [];

            for (const row of contextRows) {
                const recentTopics = await this.getChannelRecentTopics(row.channel_id, 15);
                const activeUsers = await this.getChannelActiveUsers(row.channel_id, 24);

                contexts.push({
                    channelId: row.channel_id,
                    channelName: row.channel_name,
                    channelType: row.channel_type,
                    recentTopics,
                    activeUsers,
                    conversationTone: row.conversation_tone,
                    lastActivity: row.last_activity
                });
            }

            return contexts;

        } catch (error) {
            Logger.error('❌ Failed to get all channel contexts:', error);
            return [];
        }
    }

    // =============================================================================
    // CONVERSATION HISTORY OPERATIONS
    // =============================================================================

    async addConversationMessage(message: ConversationMessage): Promise<number | null> {
        try {
            const result = this.statements.insertConversationMessage.run(
                message.channelId,
                message.userId || null,
                message.role,
                message.content,
                message.timestamp,
                message.author || null,
                message.relevanceScore || 0.0
            );

            return result.lastInsertRowid as number;

        } catch (error) {
            Logger.error('❌ Failed to add conversation message:', error);
            return null;
        }
    }

    async getConversationHistory(channelId: string, limit: number = 50): Promise<ConversationMessage[]> {
        try {
            const rows = this.statements.getConversationHistory.all(channelId, limit) as any[];
            
            return rows.map(row => ({
                id: row.id,
                channelId: row.channel_id,
                userId: row.user_id,
                role: row.role,
                content: row.content,
                timestamp: row.timestamp,
                author: row.author,
                relevanceScore: row.relevance_score
            })).reverse(); // Return in chronological order

        } catch (error) {
            Logger.error('❌ Failed to get conversation history:', error);
            return [];
        }
    }

    async deleteOldConversationHistory(olderThanDays: number): Promise<number> {
        try {
            const cutoffTimestamp = Math.floor(Date.now() / 1000) - (olderThanDays * 24 * 60 * 60);
            const result = this.db.prepare('DELETE FROM conversation_history WHERE timestamp < ?').run(cutoffTimestamp);
            
            Logger.info(`🧹 Deleted ${result.changes} old conversation messages (older than ${olderThanDays} days)`);
            return result.changes;

        } catch (error) {
            Logger.error('❌ Failed to delete old conversation history:', error);
            return 0;
        }
    }

    // =============================================================================
    // USER INTEREST OPERATIONS
    // =============================================================================

    async addUserInterest(userId: string, interest: string, weight: number = 1.0): Promise<boolean> {
        try {
            this.statements.insertUserInterest.run(userId, interest, weight, userId, interest);
            return true;

        } catch (error) {
            Logger.error('❌ Failed to add user interest:', error);
            return false;
        }
    }

    async getUserInterests(userId: string): Promise<string[]> {
        try {
            const rows = this.statements.getUserInterests.all(userId) as any[];
            return rows.map(row => row.interest);

        } catch (error) {
            Logger.error('❌ Failed to get user interests:', error);
            return [];
        }
    }

    async removeUserInterest(userId: string, interest: string): Promise<boolean> {
        try {
            const result = this.statements.deleteUserInterest.run(userId, interest);
            return result.changes > 0;

        } catch (error) {
            Logger.error('❌ Failed to remove user interest:', error);
            return false;
        }
    }

    async updateUserInterestWeight(userId: string, interest: string, weight: number): Promise<boolean> {
        try {
            const result = this.db.prepare('UPDATE user_interests SET weight = ? WHERE user_id = ? AND interest = ?')
                .run(weight, userId, interest);
            return result.changes > 0;

        } catch (error) {
            Logger.error('❌ Failed to update user interest weight:', error);
            return false;
        }
    }

    // =============================================================================
    // USER PERSONALITY OPERATIONS
    // =============================================================================

    async addPersonalityTrait(userId: string, trait: string, confidence: number = 0.5): Promise<boolean> {
        try {
            this.statements.insertPersonalityTrait.run(userId, trait, confidence, userId, trait);
            return true;

        } catch (error) {
            Logger.error('❌ Failed to add personality trait:', error);
            return false;
        }
    }

    async getPersonalityTraits(userId: string): Promise<string[]> {
        try {
            const rows = this.statements.getPersonalityTraits.all(userId) as any[];
            return rows.map(row => row.trait);

        } catch (error) {
            Logger.error('❌ Failed to get personality traits:', error);
            return [];
        }
    }

    async removePersonalityTrait(userId: string, trait: string): Promise<boolean> {
        try {
            const result = this.statements.deletePersonalityTrait.run(userId, trait);
            return result.changes > 0;

        } catch (error) {
            Logger.error('❌ Failed to remove personality trait:', error);
            return false;
        }
    }

    // =============================================================================
    // TOPIC MANAGEMENT OPERATIONS
    // =============================================================================

    async addUserRecentTopic(userId: string, topic: string, relevance: number = 1.0): Promise<boolean> {
        try {
            this.statements.insertUserRecentTopic.run(userId, topic, relevance);
            return true;

        } catch (error) {
            Logger.error('❌ Failed to add user recent topic:', error);
            return false;
        }
    }

    async getUserRecentTopics(userId: string, limit: number = 20): Promise<string[]> {
        try {
            const rows = this.statements.getUserRecentTopics.all(userId, limit) as any[];
            return rows.map(row => row.topic);

        } catch (error) {
            Logger.error('❌ Failed to get user recent topics:', error);
            return [];
        }
    }

    async addChannelRecentTopic(channelId: string, topic: string, relevance: number = 1.0): Promise<boolean> {
        try {
            this.statements.insertChannelRecentTopic.run(channelId, topic, relevance);
            return true;

        } catch (error) {
            Logger.error('❌ Failed to add channel recent topic:', error);
            return false;
        }
    }

    async getChannelRecentTopics(channelId: string, limit: number = 15): Promise<string[]> {
        try {
            const rows = this.statements.getChannelRecentTopics.all(channelId, limit) as any[];
            return rows.map(row => row.topic);

        } catch (error) {
            Logger.error('❌ Failed to get channel recent topics:', error);
            return [];
        }
    }

    async cleanupOldTopics(olderThanDays: number): Promise<number> {
        try {
            const cutoffTimestamp = Math.floor(Date.now() / 1000) - (olderThanDays * 24 * 60 * 60);
            
            const userTopicsResult = this.db.prepare('DELETE FROM user_recent_topics WHERE mentioned_at < ?').run(cutoffTimestamp);
            const channelTopicsResult = this.db.prepare('DELETE FROM channel_recent_topics WHERE mentioned_at < ?').run(cutoffTimestamp);
            
            const totalDeleted = userTopicsResult.changes + channelTopicsResult.changes;
            Logger.info(`🧹 Deleted ${totalDeleted} old topics (older than ${olderThanDays} days)`);
            return totalDeleted;

        } catch (error) {
            Logger.error('❌ Failed to cleanup old topics:', error);
            return 0;
        }
    }

    // =============================================================================
    // CHANNEL ACTIVE USERS OPERATIONS
    // =============================================================================

    async addChannelActiveUser(channelId: string, userId: string): Promise<boolean> {
        try {
            this.statements.insertChannelActiveUser.run(channelId, userId, channelId, userId);
            return true;

        } catch (error) {
            Logger.error('❌ Failed to add channel active user:', error);
            return false;
        }
    }

    async getChannelActiveUsers(channelId: string, activeWithinHours: number = 24): Promise<string[]> {
        try {
            const cutoffSeconds = activeWithinHours * 60 * 60;
            const rows = this.statements.getChannelActiveUsers.all(channelId, cutoffSeconds) as any[];
            return rows.map(row => row.user_id);

        } catch (error) {
            Logger.error('❌ Failed to get channel active users:', error);
            return [];
        }
    }

    async updateUserActivity(channelId: string, userId: string): Promise<boolean> {
        try {
            const result = this.db.prepare(`
                UPDATE channel_active_users 
                SET last_active = strftime('%s', 'now'), activity_count = activity_count + 1
                WHERE channel_id = ? AND user_id = ?
            `).run(channelId, userId);
            
            return result.changes > 0;

        } catch (error) {
            Logger.error('❌ Failed to update user activity:', error);
            return false;
        }
    }

    // =============================================================================
    // UTILITY OPERATIONS
    // =============================================================================

    async getUserStats(userId: string): Promise<any> {
        try {
            const profile = this.statements.getUserProfile.get(userId) as any;
            if (!profile) return null;

            const interestCount = this.db.prepare('SELECT COUNT(*) as count FROM user_interests WHERE user_id = ?').get(userId) as any;
            const personalityCount = this.db.prepare('SELECT COUNT(*) as count FROM user_personality_traits WHERE user_id = ?').get(userId) as any;
            const recentTopicCount = this.db.prepare('SELECT COUNT(*) as count FROM user_recent_topics WHERE user_id = ?').get(userId) as any;
            const messageCount = this.db.prepare('SELECT COUNT(*) as count FROM conversation_history WHERE user_id = ?').get(userId) as any;

            return {
                userId: profile.user_id,
                username: profile.username,
                interactionCount: profile.interaction_count,
                lastSeen: profile.last_seen,
                interests: interestCount.count,
                personalityTraits: personalityCount.count,
                recentTopics: recentTopicCount.count,
                messages: messageCount.count
            };

        } catch (error) {
            Logger.error('❌ Failed to get user stats:', error);
            return null;
        }
    }

    async getChannelStats(channelId: string): Promise<any> {
        try {
            const context = this.statements.getChannelContext.get(channelId) as any;
            if (!context) return null;

            const topicCount = this.db.prepare('SELECT COUNT(*) as count FROM channel_recent_topics WHERE channel_id = ?').get(channelId) as any;
            const activeUserCount = this.db.prepare('SELECT COUNT(*) as count FROM channel_active_users WHERE channel_id = ?').get(channelId) as any;
            const messageCount = this.db.prepare('SELECT COUNT(*) as count FROM conversation_history WHERE channel_id = ?').get(channelId) as any;

            return {
                channelId: context.channel_id,
                channelName: context.channel_name,
                channelType: context.channel_type,
                conversationTone: context.conversation_tone,
                lastActivity: context.last_activity,
                recentTopics: topicCount.count,
                activeUsers: activeUserCount.count,
                messages: messageCount.count
            };

        } catch (error) {
            Logger.error('❌ Failed to get channel stats:', error);
            return null;
        }
    }

    async getDatabaseStats(): Promise<any> {
        try {
            const userCount = this.db.prepare('SELECT COUNT(*) as count FROM user_profiles').get() as any;
            const channelCount = this.db.prepare('SELECT COUNT(*) as count FROM channel_contexts').get() as any;
            const messageCount = this.db.prepare('SELECT COUNT(*) as count FROM conversation_history').get() as any;
            const interestCount = this.db.prepare('SELECT COUNT(*) as count FROM user_interests').get() as any;
            const personalityCount = this.db.prepare('SELECT COUNT(*) as count FROM user_personality_traits').get() as any;
            const topicCount = this.db.prepare('SELECT COUNT(*) as count FROM user_recent_topics').get() as any;

            return {
                users: userCount.count,
                channels: channelCount.count,
                messages: messageCount.count,
                interests: interestCount.count,
                personalityTraits: personalityCount.count,
                topics: topicCount.count
            };

        } catch (error) {
            Logger.error('❌ Failed to get database stats:', error);
            return null;
        }
    }

    async cleanupOldData(olderThanDays: number): Promise<void> {
        try {
            Logger.info(`🧹 Starting database cleanup (older than ${olderThanDays} days)...`);

            // Clean up old conversation history
            const messagesDeleted = await this.deleteOldConversationHistory(olderThanDays);
            
            // Clean up old topics
            const topicsDeleted = await this.cleanupOldTopics(7); // Keep topics for 7 days
            
            // Clean up inactive channel users (older than 24 hours)
            const cutoffTimestamp = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
            const inactiveUsersResult = this.db.prepare('DELETE FROM channel_active_users WHERE last_active < ?').run(cutoffTimestamp);
            
            Logger.success(`✅ Database cleanup completed: ${messagesDeleted} messages, ${topicsDeleted} topics, ${inactiveUsersResult.changes} inactive users`);

        } catch (error) {
            Logger.error('❌ Failed to cleanup old data:', error);
            throw error;
        }
    }
}