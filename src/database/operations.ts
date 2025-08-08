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
  addServerRecentEvent(serverId: string, event: string): Promise<boolean>;
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
      await this.prisma.userProfile.upsert({
        where: { userId: profile.userId },
        update: {
          username: profile.username,
          displayName: profile.displayName,
          interactionCount: profile.interactionCount,
          lastSeen: BigInt(profile.lastSeen),
          preferredResponseStyle: profile.preferredResponseStyle,
          timezone: profile.timezone,
          language: profile.language,
          bio: profile.bio,
          goals: profile.goals,
          preferences: profile.preferences,
          notes: profile.notes,
          interests: profile.interests,
          personality: profile.personality,
          recentTopics: profile.recentTopics,
        },
        create: {
          userId: profile.userId,
          username: profile.username,
          displayName: profile.displayName,
          interactionCount: profile.interactionCount,
          lastSeen: BigInt(profile.lastSeen),
          preferredResponseStyle: profile.preferredResponseStyle,
          timezone: profile.timezone,
          language: profile.language,
          bio: profile.bio,
          goals: profile.goals,
          preferences: profile.preferences,
          notes: profile.notes,
          interests: profile.interests,
          personality: profile.personality,
          recentTopics: profile.recentTopics,
        },
      });
      return true;
    } catch (error) {
      Logger.error('Failed to create user profile:', error);
      return false;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const row = await this.prisma.userProfile.findUnique({ where: { userId } });
      if (!row) return null;
      return {
        userId: row.userId,
        username: row.username,
        displayName: row.displayName ?? undefined,
        interests: (row.interests as string[]) ?? [],
        personality: (row.personality as string[]) ?? [],
        recentTopics: (row.recentTopics as string[]) ?? [],
        interactionCount: row.interactionCount,
        lastSeen: Number(row.lastSeen),
        preferredResponseStyle: row.preferredResponseStyle ?? undefined,
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
    if (Object.keys(updates).length === 0) return true;
    try {
      const data: any = { ...updates };
      if (updates.lastSeen !== undefined) data.lastSeen = BigInt(updates.lastSeen);
      await this.prisma.userProfile.update({
        where: { userId },
        data,
      });
      return true;
    } catch (error) {
      Logger.error('Failed to update user profile:', error);
      return false;
    }
  }
  // ======================= CHANNEL CONTEXTS =======================
  async createChannelContext(context: ChannelContext): Promise<boolean> {
    try {
      await this.prisma.channelContext.upsert({
        where: { channelId: context.channelId },
        update: {
          channelName: context.channelName,
          channelType: context.channelType,
          conversationTone: context.conversationTone,
          lastActivity: BigInt(context.lastActivity),
          recentTopics: context.recentTopics,
          activeUsers: context.activeUsers,
        },
        create: {
          channelId: context.channelId,
          channelName: context.channelName,
          channelType: context.channelType,
          conversationTone: context.conversationTone,
          lastActivity: BigInt(context.lastActivity),
          recentTopics: context.recentTopics,
          activeUsers: context.activeUsers,
        },
      });
      return true;
    } catch (error) {
      Logger.error('Failed to create channel context:', error);
      return false;
    }
  }

  async getChannelContext(channelId: string): Promise<ChannelContext | null> {
    try {
      const row = await this.prisma.channelContext.findUnique({ where: { channelId } });
      if (!row) return null;
      return {
        channelId: row.channelId,
        channelName: row.channelName,
        channelType: row.channelType,
        recentTopics: (row.recentTopics as string[]) ?? [],
        activeUsers: (row.activeUsers as string[]) ?? [],
        conversationTone: row.conversationTone as ChannelContext['conversationTone'],
        lastActivity: Number(row.lastActivity),
      };
    } catch (error) {
      Logger.error('Failed to get channel context:', error);
      return null;
    }
  }

  async updateChannelContext(channelId: string, updates: Partial<ChannelContext>): Promise<boolean> {
    if (Object.keys(updates).length === 0) return true;
    try {
      const data: any = { ...updates };
      if (updates.lastActivity !== undefined) data.lastActivity = BigInt(updates.lastActivity);
      await this.prisma.channelContext.update({
        where: { channelId },
        data,
      });
      return true;
    } catch (error) {
      Logger.error('Failed to update channel context:', error);
      return false;
    }
  }

  async addChannelActiveUser(channelId: string, userId: string): Promise<boolean> {
    try {
      const row = await this.prisma.channelContext.findUnique({ where: { channelId } });
      if (!row) return false;
      const users: string[] = (row.activeUsers as string[]) ?? [];
      if (!users.includes(userId)) users.push(userId);
      await this.prisma.channelContext.update({
        where: { channelId },
        data: { activeUsers: users },
      });
      return true;
    } catch (error) {
      Logger.error('Failed to add channel active user:', error);
      return false;
    }
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    try {
      const res = await this.prisma.userProfile.findMany();
      return res.map((row: any) => ({
        userId: row.userId,
        username: row.username,
        displayName: row.displayName ?? undefined,
        interests: (row.interests as string[]) ?? [],
        personality: (row.personality as string[]) ?? [],
        recentTopics: (row.recentTopics as string[]) ?? [],
        interactionCount: row.interactionCount,
        lastSeen: Number(row.lastSeen),
        preferredResponseStyle: row.preferredResponseStyle ?? undefined,
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
      const res = await this.prisma.channelContext.findMany();
      return res.map((row: any) => ({
        channelId: row.channelId,
        channelName: row.channelName,
        channelType: row.channelType,
        recentTopics: (row.recentTopics as string[]) ?? [],
        activeUsers: (row.activeUsers as string[]) ?? [],
        conversationTone: row.conversationTone as ChannelContext['conversationTone'],
        lastActivity: Number(row.lastActivity),
      }));
    } catch (error) {
      Logger.error('Failed to get all channel contexts:', error);
      return [];
    }
  }

  // ======================= SERVER PROFILES =======================
  async createServerProfile(profile: ServerContext): Promise<boolean> {
    try {
      await this.prisma.serverProfile.upsert({
        where: { serverId: profile.serverId },
        update: {
          serverName: profile.serverName,
          ownerId: profile.ownerId,
          memberCount: profile.memberCount ?? 0,
          lastActivity: BigInt(profile.lastActivity),
          recentEvents: profile.recentEvents,
          ignoringChannels: profile.ignoringChannels,
          listeningChannels: profile.listeningChannels,
          commandPrefix: profile.commandPrefix,
        },
        create: {
          serverId: profile.serverId,
          serverName: profile.serverName,
          ownerId: profile.ownerId,
          memberCount: profile.memberCount ?? 0,
          lastActivity: BigInt(profile.lastActivity),
          recentEvents: profile.recentEvents,
          ignoringChannels: profile.ignoringChannels,
          listeningChannels: profile.listeningChannels,
          commandPrefix: profile.commandPrefix,
        },
      });
      return true;
    } catch (error) {
      Logger.error('Failed to create server profile:', error);
      return false;
    }
  }

  async getServerProfile(serverId: string): Promise<ServerContext | null> {
    try {
      const row = await this.prisma.serverProfile.findUnique({ where: { serverId } });
      if (!row) return null;
      return {
        serverId: row.serverId,
        serverName: row.serverName,
        ownerId: row.ownerId ?? undefined,
        memberCount: row.memberCount ?? undefined,
        recentEvents: (row.recentEvents as string[]) ?? [],
        ignoringChannels: (row.ignoringChannels as string[]) ?? [],
        listeningChannels: (row.listeningChannels as string[]) ?? [],
        commandPrefix: row.commandPrefix ?? undefined,
        lastActivity: Number(row.lastActivity),
      };
    } catch (error) {
      Logger.error('Failed to get server profile:', error);
      return null;
    }
  }

  async updateServerProfile(serverId: string, updates: Partial<ServerContext>): Promise<boolean> {
    if (Object.keys(updates).length === 0) return true;
    try {
      const data: any = { ...updates };
      if (updates.lastActivity !== undefined) data.lastActivity = BigInt(updates.lastActivity);
      await this.prisma.serverProfile.update({
        where: { serverId },
        data,
      });
      return true;
    } catch (error) {
      Logger.error('Failed to update server profile:', error);
      return false;
    }
  }

  async addServerRecentEvent(serverId: string, event: string): Promise<boolean> {
    try {
      const row = await this.prisma.serverProfile.findUnique({ where: { serverId } });
      const events: string[] = row?.recentEvents ? (row.recentEvents as string[]) : [];
      events.unshift(event);
      await this.prisma.serverProfile.update({
        where: { serverId },
        data: { recentEvents: events.slice(0, 50) },
      });
      return true;
    } catch (error) {
      Logger.error('Failed to add server event:', error);
      return false;
    }
  }

  async getServerRecentEvents(serverId: string, limit = 10): Promise<string[]> {
    try {
      const row = await this.prisma.serverProfile.findUnique({ where: { serverId }, select: { recentEvents: true } });
      const events: string[] = (row?.recentEvents as string[]) ?? [];
      return events.slice(0, limit);
    } catch (error) {
      Logger.error('Failed to get server events:', error);
      return [];
    }
  }

  // ======================= CONVERSATION HISTORY =======================
  async addConversationMessage(message: ConversationMessage): Promise<number | null> {
    try {
      const res = await this.prisma.conversationHistory.create({
        data: {
          channelId: message.channelId,
          userId: message.userId,
          role: message.role,
          content: message.content,
          timestamp: BigInt(message.timestamp),
          author: message.author,
          relevanceScore: message.relevanceScore ?? 0,
        },
        select: { id: true },
      });
      return res.id;
    } catch (error) {
      Logger.error('Failed to add conversation message:', error);
      return null;
    }
  }

  async getConversationHistory(channelId: string, limit = 20): Promise<ConversationMessage[]> {
    try {
      const res = await this.prisma.conversationHistory.findMany({
        where: { channelId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
      return res.map((row: any) => ({
        id: row.id,
        channelId: row.channelId,
        userId: row.userId ?? undefined,
        role: row.role as 'user' | 'assistant',
        content: row.content,
        timestamp: Number(row.timestamp),
        author: row.author ?? undefined,
        relevanceScore: row.relevanceScore ?? undefined,
      }));
    } catch (error) {
      Logger.error('Failed to get conversation history:', error);
      return [];
    }
  }

  async deleteOldConversationHistory(olderThanDays: number): Promise<number> {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    try {
      const res = await this.prisma.conversationHistory.deleteMany({
        where: { timestamp: { lt: BigInt(cutoff) } },
      });
      return res.count;
    } catch (error) {
      Logger.error('Failed to delete old conversation history:', error);
      return 0;
    }
  }

  // ======================= STATS & CLEANUP =======================
  async getUserStats(userId: string): Promise<any> {
    try {
      const messages = await this.prisma.conversationHistory.count({ where: { userId } });
      return { messages };
    } catch (error) {
      Logger.error('Failed to get user stats:', error);
      return null;
    }
  }

  async getChannelStats(channelId: string): Promise<any> {
    try {
      const messages = await this.prisma.conversationHistory.count({ where: { channelId } });
      return { messages };
    } catch (error) {
      Logger.error('Failed to get channel stats:', error);
      return null;
    }
  }

  async getDatabaseStats(): Promise<any> {
    try {
      const [users, channels, servers, messages] = await Promise.all([
        this.prisma.userProfile.count(),
        this.prisma.channelContext.count(),
        this.prisma.serverProfile.count(),
        this.prisma.conversationHistory.count(),
      ]);
      return { users, channels, servers, messages };
    } catch (error) {
      Logger.error('Failed to get database stats:', error);
      return null;
    }
  }

  async cleanupOldData(olderThanDays: number): Promise<void> {
    await this.deleteOldConversationHistory(olderThanDays);
  }
}
