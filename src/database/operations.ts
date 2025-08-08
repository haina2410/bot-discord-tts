import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger.js';
import type { UserProfile, ChannelContext, ServerContext } from '../ai/contextManager.js';

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
  createUserProfile(profile: UserProfile): Promise<boolean>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean>;

  createChannelContext(context: ChannelContext): Promise<boolean>;
  getChannelContext(channelId: string): Promise<ChannelContext | null>;
  updateChannelContext(channelId: string, updates: Partial<ChannelContext>): Promise<boolean>;
  addChannelActiveUser(channelId: string, userId: string): Promise<boolean>;
  getAllUserProfiles(): Promise<UserProfile[]>;
  getAllChannelContexts(): Promise<ChannelContext[]>;

  createServerProfile(profile: ServerContext): Promise<boolean>;
  getServerProfile(serverId: string): Promise<ServerContext | null>;
  updateServerProfile(serverId: string, updates: Partial<ServerContext>): Promise<boolean>;
  addServerRecentEvent(serverId: string, event: string, detail?: string): Promise<boolean>;
  getServerRecentEvents(serverId: string, limit?: number): Promise<string[]>;

  addConversationMessage(message: ConversationMessage): Promise<number | null>;
  getConversationHistory(channelId: string, limit?: number): Promise<ConversationMessage[]>;
  deleteOldConversationHistory(olderThanDays: number): Promise<number>;

  getUserStats(userId: string): Promise<any>;
  getChannelStats(channelId: string): Promise<any>;
  getDatabaseStats(): Promise<any>;
  cleanupOldData(olderThanDays: number): Promise<void>;
}

export class DatabaseCRUD implements DatabaseOperations {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ======================= USER PROFILES =======================
  async createUserProfile(profile: UserProfile): Promise<boolean> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO user_profiles (
           user_id, username, display_name, interaction_count, last_seen,
           preferred_response_style, timezone, language, bio, goals, preferences, notes,
           interests, personality, recent_topics
         ) VALUES (
           ${profile.userId}, ${profile.username}, ${profile.displayName ?? null}, ${profile.interactionCount}, ${profile.lastSeen},
           ${profile.preferredResponseStyle ?? null}, ${profile.timezone ?? null}, ${profile.language ?? null}, ${profile.bio ?? null}, ${profile.goals ?? null}, ${profile.preferences ?? null}, ${profile.notes ?? null},
           ${JSON.stringify(profile.interests)}, ${JSON.stringify(profile.personality)}, ${JSON.stringify(profile.recentTopics)}
         )
         ON CONFLICT (user_id) DO UPDATE SET
           username=EXCLUDED.username,
           display_name=EXCLUDED.display_name,
           interaction_count=EXCLUDED.interaction_count,
           last_seen=EXCLUDED.last_seen,
           preferred_response_style=EXCLUDED.preferred_response_style,
           timezone=EXCLUDED.timezone,
           language=EXCLUDED.language,
           bio=EXCLUDED.bio,
           goals=EXCLUDED.goals,
           preferences=EXCLUDED.preferences,
           notes=EXCLUDED.notes,
           interests=EXCLUDED.interests,
           personality=EXCLUDED.personality,
           recent_topics=EXCLUDED.recent_topics`;
      return true;
    } catch (error) {
      Logger.error('Failed to create user profile:', error);
      return false;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const res: any = await this.prisma.$queryRaw`SELECT * FROM user_profiles WHERE user_id=${userId}`;
      if (res.length === 0) return null;
      const row = res[0];
      return {
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name ?? undefined,
        interests: row.interests ?? [],
        personality: row.personality ?? [],
        recentTopics: row.recent_topics ?? [],
        interactionCount: Number(row.interaction_count),
        lastSeen: Number(row.last_seen),
        preferredResponseStyle: row.preferred_response_style ?? undefined,
        timezone: row.timezone ?? undefined,
        language: row.language ?? undefined,
        bio: row.bio ?? undefined,
        goals: row.goals ?? undefined,
        preferences: row.preferences ?? undefined,
        notes: row.notes ?? undefined,
      };
    } catch (error) {
      Logger.error('Failed to get user profile:', error);
      return null;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    const add = (col: string, val: any) => {
      fields.push(`${col}=$${idx++}`);
      values.push(val);
    };
    if (updates.username !== undefined) add('username', updates.username);
    if (updates.displayName !== undefined) add('display_name', updates.displayName);
    if (updates.interactionCount !== undefined) add('interaction_count', updates.interactionCount);
    if (updates.lastSeen !== undefined) add('last_seen', updates.lastSeen);
    if (updates.preferredResponseStyle !== undefined) add('preferred_response_style', updates.preferredResponseStyle);
    if (updates.timezone !== undefined) add('timezone', updates.timezone);
    if (updates.language !== undefined) add('language', updates.language);
    if (updates.bio !== undefined) add('bio', updates.bio);
    if (updates.goals !== undefined) add('goals', updates.goals);
    if (updates.preferences !== undefined) add('preferences', updates.preferences);
    if (updates.notes !== undefined) add('notes', updates.notes);
    if (updates.interests !== undefined) add('interests', JSON.stringify(updates.interests));
    if (updates.personality !== undefined) add('personality', JSON.stringify(updates.personality));
    if (updates.recentTopics !== undefined) add('recent_topics', JSON.stringify(updates.recentTopics));
    if (fields.length === 0) return true;
    values.push(userId);
    const query = `UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id=$${idx}`;
    try {
      await this.prisma.$executeRawUnsafe(query, ...values);
      return true;
    } catch (error) {
      Logger.error('Failed to update user profile:', error);
      return false;
    }
  }
  // ======================= CHANNEL CONTEXTS =======================
  async createChannelContext(context: ChannelContext): Promise<boolean> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO channel_contexts (
           channel_id, channel_name, channel_type, conversation_tone, last_activity,
           recent_topics, active_users
         ) VALUES (
           ${context.channelId}, ${context.channelName}, ${context.channelType}, ${context.conversationTone}, ${context.lastActivity},
           ${JSON.stringify(context.recentTopics)}, ${JSON.stringify(context.activeUsers)}
         )
         ON CONFLICT (channel_id) DO UPDATE SET
           channel_name=EXCLUDED.channel_name,
           channel_type=EXCLUDED.channel_type,
           conversation_tone=EXCLUDED.conversation_tone,
           last_activity=EXCLUDED.last_activity,
           recent_topics=EXCLUDED.recent_topics,
           active_users=EXCLUDED.active_users`;
      return true;
    } catch (error) {
      Logger.error('Failed to create channel context:', error);
      return false;
    }
  }

  async getChannelContext(channelId: string): Promise<ChannelContext | null> {
    try {
      const res: any = await this.prisma.$queryRaw`SELECT * FROM channel_contexts WHERE channel_id=${channelId}`;
      if (res.length === 0) return null;
      const row = res[0];
      return {
        channelId: row.channel_id,
        channelName: row.channel_name,
        channelType: row.channel_type,
        recentTopics: row.recent_topics ?? [],
        activeUsers: row.active_users ?? [],
        conversationTone: row.conversation_tone,
        lastActivity: Number(row.last_activity),
      };
    } catch (error) {
      Logger.error('Failed to get channel context:', error);
      return null;
    }
  }

  async updateChannelContext(channelId: string, updates: Partial<ChannelContext>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    const add = (c: string, v: any) => {
      fields.push(`${c}=$${idx++}`);
      values.push(v);
    };
    if (updates.channelName !== undefined) add('channel_name', updates.channelName);
    if (updates.channelType !== undefined) add('channel_type', updates.channelType);
    if (updates.conversationTone !== undefined) add('conversation_tone', updates.conversationTone);
    if (updates.lastActivity !== undefined) add('last_activity', updates.lastActivity);
    if (updates.recentTopics !== undefined) add('recent_topics', JSON.stringify(updates.recentTopics));
    if (updates.activeUsers !== undefined) add('active_users', JSON.stringify(updates.activeUsers));
    if (fields.length === 0) return true;
    values.push(channelId);
    const query = `UPDATE channel_contexts SET ${fields.join(', ')} WHERE channel_id=$${idx}`;
    try {
      await this.prisma.$executeRawUnsafe(query, ...values);
      return true;
    } catch (error) {
      Logger.error('Failed to update channel context:', error);
      return false;
    }
  }

  async addChannelActiveUser(channelId: string, userId: string): Promise<boolean> {
    try {
      const res: any = await this.prisma.$queryRaw`SELECT active_users FROM channel_contexts WHERE channel_id=${channelId}`;
      if (res.length === 0) return false;
      const users: string[] = res[0].active_users ?? [];
      if (!users.includes(userId)) users.push(userId);
      await this.prisma.$executeRaw`UPDATE channel_contexts SET active_users=${JSON.stringify(users)} WHERE channel_id=${channelId}`;
      return true;
    } catch (error) {
      Logger.error('Failed to add channel active user:', error);
      return false;
    }
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    try {
      const res: any = await this.prisma.$queryRaw`SELECT * FROM user_profiles`;
      return res.map((row: any) => ({
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name ?? undefined,
        interests: row.interests ?? [],
        personality: row.personality ?? [],
        recentTopics: row.recent_topics ?? [],
        interactionCount: Number(row.interaction_count),
        lastSeen: Number(row.last_seen),
        preferredResponseStyle: row.preferred_response_style ?? undefined,
        timezone: row.timezone ?? undefined,
        language: row.language ?? undefined,
        bio: row.bio ?? undefined,
        goals: row.goals ?? undefined,
        preferences: row.preferences ?? undefined,
        notes: row.notes ?? undefined,
      }));
    } catch (error) {
      Logger.error('Failed to get all user profiles:', error);
      return [];
    }
  }

  async getAllChannelContexts(): Promise<ChannelContext[]> {
    try {
      const res: any = await this.prisma.$queryRaw`SELECT * FROM channel_contexts`;
      return res.map((row: any) => ({
        channelId: row.channel_id,
        channelName: row.channel_name,
        channelType: row.channel_type,
        recentTopics: row.recent_topics ?? [],
        activeUsers: row.active_users ?? [],
        conversationTone: row.conversation_tone,
        lastActivity: Number(row.last_activity),
      }));
    } catch (error) {
      Logger.error('Failed to get all channel contexts:', error);
      return [];
    }
  }

  // ======================= SERVER PROFILES =======================
  async createServerProfile(profile: ServerContext): Promise<boolean> {
    try {
      // Cast JSON.stringify result to jsonb using :: operator
      await this.prisma.$executeRaw`
        INSERT INTO server_profiles (
           server_id, server_name, owner_id, member_count, last_activity, recent_events
         ) VALUES (
           ${profile.serverId}, ${profile.serverName}, ${profile.ownerId ?? null}, ${profile.memberCount ?? 0}, ${profile.lastActivity}, ${JSON.stringify(profile.recentEvents)}::jsonb
         )
         ON CONFLICT (server_id) DO UPDATE SET
           server_name=EXCLUDED.server_name,
           owner_id=EXCLUDED.owner_id,
           member_count=EXCLUDED.member_count,
           last_activity=EXCLUDED.last_activity,
           recent_events=EXCLUDED.recent_events`;
      return true;
    } catch (error) {
      Logger.error('Failed to create server profile:', error);
      return false;
    }
  }

  async getServerProfile(serverId: string): Promise<ServerContext | null> {
    try {
      const res: any = await this.prisma.$queryRaw`SELECT * FROM server_profiles WHERE server_id=${serverId}`;
      if (res.length === 0) return null;
      const row = res[0];
      return {
        serverId: row.server_id,
        serverName: row.server_name,
        ownerId: row.owner_id ?? undefined,
        memberCount: row.member_count ?? undefined,
        recentEvents: row.recent_events ?? [],
        lastActivity: Number(row.last_activity),
      };
    } catch (error) {
      Logger.error('Failed to get server profile:', error);
      return null;
    }
  }

  async updateServerProfile(serverId: string, updates: Partial<ServerContext>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    const add = (c: string, v: any) => {
      fields.push(`${c}=$${idx++}`);
      values.push(v);
    };
    if (updates.serverName !== undefined) add('server_name', updates.serverName);
    if (updates.ownerId !== undefined) add('owner_id', updates.ownerId);
    if (updates.memberCount !== undefined) add('member_count', updates.memberCount);
    if (updates.lastActivity !== undefined) add('last_activity', updates.lastActivity);
    if (updates.recentEvents !== undefined) add('recent_events', JSON.stringify(updates.recentEvents));
    if (fields.length === 0) return true;
    values.push(serverId);
    const query = `UPDATE server_profiles SET ${fields.join(', ')} WHERE server_id=$${idx}`;
    try {
      await this.prisma.$executeRawUnsafe(query, ...values);
      return true;
    } catch (error) {
      Logger.error('Failed to update server profile:', error);
      return false;
    }
  }

  async addServerRecentEvent(serverId: string, event: string, detail?: string): Promise<boolean> {
    try {
      const res: any = await this.prisma.$queryRaw`SELECT recent_events FROM server_profiles WHERE server_id=${serverId}`;
      const events: string[] = res.length ? res[0].recent_events ?? [] : [];
      events.unshift(detail ? `${event}:${detail}` : event);
      await this.prisma.$executeRaw`UPDATE server_profiles SET recent_events=${JSON.stringify(events.slice(0,50))} WHERE server_id=${serverId}`;
      return true;
    } catch (error) {
      Logger.error('Failed to add server event:', error);
      return false;
    }
  }

  async getServerRecentEvents(serverId: string, limit = 10): Promise<string[]> {
    try {
      const res: any = await this.prisma.$queryRaw`SELECT recent_events FROM server_profiles WHERE server_id=${serverId}`;
      if (res.length === 0) return [];
      const events: string[] = res[0].recent_events ?? [];
      return events.slice(0, limit);
    } catch (error) {
      Logger.error('Failed to get server events:', error);
      return [];
    }
  }

  // ======================= CONVERSATION HISTORY =======================
  async addConversationMessage(message: ConversationMessage): Promise<number | null> {
    try {
      const res: any = await this.prisma.$queryRaw`INSERT INTO conversation_history (
           channel_id, user_id, role, content, timestamp, author, relevance_score
         ) VALUES (
           ${message.channelId}, ${message.userId ?? null}, ${message.role}, ${message.content}, ${message.timestamp}, ${message.author ?? null}, ${message.relevanceScore ?? 0}
         ) RETURNING id`;
      return res[0]?.id ?? null;
    } catch (error) {
      Logger.error('Failed to add conversation message:', error);
      return null;
    }
  }

  async getConversationHistory(channelId: string, limit = 20): Promise<ConversationMessage[]> {
    try {
      const res: any = await this.prisma.$queryRaw`SELECT * FROM conversation_history WHERE channel_id=${channelId} ORDER BY timestamp DESC LIMIT ${limit}`;
      return res.map((row: any) => ({
        id: row.id,
        channelId: row.channel_id,
        userId: row.user_id,
        role: row.role,
        content: row.content,
        timestamp: Number(row.timestamp),
        author: row.author ?? undefined,
        relevanceScore: row.relevance_score ?? undefined,
      }));
    } catch (error) {
      Logger.error('Failed to get conversation history:', error);
      return [];
    }
  }

  async deleteOldConversationHistory(olderThanDays: number): Promise<number> {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    try {
      const res: any = await this.prisma.$executeRaw`DELETE FROM conversation_history WHERE timestamp < ${cutoff}`;
      // $executeRaw returns number of affected rows
      return Number(res);
    } catch (error) {
      Logger.error('Failed to delete old conversation history:', error);
      return 0;
    }
  }

  // ======================= STATS & CLEANUP =======================
  async getUserStats(userId: string): Promise<any> {
    try {
      const res: any = await this.prisma.$queryRaw`SELECT COUNT(*) AS messages FROM conversation_history WHERE user_id=${userId}`;
      return { messages: Number(res[0].messages) };
    } catch (error) {
      Logger.error('Failed to get user stats:', error);
      return null;
    }
  }

  async getChannelStats(channelId: string): Promise<any> {
    try {
      const res: any = await this.prisma.$queryRaw`SELECT COUNT(*) AS messages FROM conversation_history WHERE channel_id=${channelId}`;
      return { messages: Number(res[0].messages) };
    } catch (error) {
      Logger.error('Failed to get channel stats:', error);
      return null;
    }
  }

  async getDatabaseStats(): Promise<any> {
    try {
      const res: any = await this.prisma.$queryRaw`SELECT
           (SELECT COUNT(*) FROM user_profiles) AS users,
           (SELECT COUNT(*) FROM channel_contexts) AS channels,
           (SELECT COUNT(*) FROM server_profiles) AS servers,
           (SELECT COUNT(*) FROM conversation_history) AS messages`;
      return res[0];
    } catch (error) {
      Logger.error('Failed to get database stats:', error);
      return null;
    }
  }

  async cleanupOldData(olderThanDays: number): Promise<void> {
    await this.deleteOldConversationHistory(olderThanDays);
  }
}
