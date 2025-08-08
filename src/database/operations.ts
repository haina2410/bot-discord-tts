import { Logger } from '../utils/logger.js';
import type { UserProfile, ChannelContext, ServerContext } from '../ai/contextManager.js';

type PrismaClient = any;

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
  constructor(private prisma: PrismaClient) {}

  // ======================= USER PROFILES =======================
  async createUserProfile(profile: UserProfile): Promise<boolean> {
    try {
      await this.prisma.userProfile.upsert({
        where: { userId: profile.userId },
        create: {
          userId: profile.userId,
          username: profile.username,
          displayName: profile.displayName ?? null,
          interactionCount: profile.interactionCount,
          lastSeen: BigInt(profile.lastSeen),
          preferredResponseStyle: profile.preferredResponseStyle ?? null,
          timezone: profile.timezone ?? null,
          language: profile.language ?? null,
          bio: profile.bio ?? null,
          goals: profile.goals ?? null,
          preferences: profile.preferences ?? null,
          notes: profile.notes ?? null,
          interests: profile.interests,
          personality: profile.personality,
          recentTopics: profile.recentTopics,
        },
        update: {
          username: profile.username,
          displayName: profile.displayName ?? null,
          interactionCount: profile.interactionCount,
          lastSeen: BigInt(profile.lastSeen),
          preferredResponseStyle: profile.preferredResponseStyle ?? null,
          timezone: profile.timezone ?? null,
          language: profile.language ?? null,
          bio: profile.bio ?? null,
          goals: profile.goals ?? null,
          preferences: profile.preferences ?? null,
          notes: profile.notes ?? null,
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
        preferredResponseStyle: (row.preferredResponseStyle as any) ?? undefined,
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
    try {
      await this.prisma.userProfile.update({
        where: { userId },
        data: {
          username: updates.username,
          displayName: updates.displayName,
          interactionCount: updates.interactionCount,
          lastSeen: updates.lastSeen !== undefined ? BigInt(updates.lastSeen) : undefined,
          preferredResponseStyle: updates.preferredResponseStyle,
          timezone: updates.timezone,
          language: updates.language,
          bio: updates.bio,
          goals: updates.goals,
          preferences: updates.preferences,
          notes: updates.notes,
          interests: updates.interests,
          personality: updates.personality,
          recentTopics: updates.recentTopics,
        },
      });
      return true;
    } catch (error) {
      Logger.error('Failed to update user profile:', error);
      return false;
    }
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    const rows = await this.prisma.userProfile.findMany();
    return rows.map((row) => ({
      userId: row.userId,
      username: row.username,
      displayName: row.displayName ?? undefined,
      interests: (row.interests as string[]) ?? [],
      personality: (row.personality as string[]) ?? [],
      recentTopics: (row.recentTopics as string[]) ?? [],
      interactionCount: row.interactionCount,
      lastSeen: Number(row.lastSeen),
      preferredResponseStyle: (row.preferredResponseStyle as any) ?? undefined,
      timezone: row.timezone ?? undefined,
      language: row.language ?? undefined,
      bio: row.bio ?? undefined,
      goals: row.goals ?? undefined,
      preferences: row.preferences ?? undefined,
      notes: row.notes ?? undefined,
    }));
  }

  // ======================= CHANNEL CONTEXTS =======================
  async createChannelContext(context: ChannelContext): Promise<boolean> {
    try {
      await this.prisma.channelContext.upsert({
        where: { channelId: context.channelId },
        create: {
          channelId: context.channelId,
          channelName: context.channelName,
          channelType: context.channelType,
          conversationTone: context.conversationTone,
          lastActivity: BigInt(context.lastActivity),
          recentTopics: context.recentTopics,
          activeUsers: context.activeUsers,
        },
        update: {
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
        conversationTone: (row.conversationTone as any) ?? 'casual',
        lastActivity: Number(row.lastActivity),
      };
    } catch (error) {
      Logger.error('Failed to get channel context:', error);
      return null;
    }
  }

  async updateChannelContext(channelId: string, updates: Partial<ChannelContext>): Promise<boolean> {
    try {
      await this.prisma.channelContext.update({
        where: { channelId },
        data: {
          channelName: updates.channelName,
          channelType: updates.channelType,
          conversationTone: updates.conversationTone,
          lastActivity: updates.lastActivity !== undefined ? BigInt(updates.lastActivity) : undefined,
          recentTopics: updates.recentTopics,
          activeUsers: updates.activeUsers,
        },
      });
      return true;
    } catch (error) {
      Logger.error('Failed to update channel context:', error);
      return false;
    }
  }

  async addChannelActiveUser(channelId: string, userId: string): Promise<boolean> {
    try {
      const ctx = await this.prisma.channelContext.findUnique({ where: { channelId } });
      const users = (ctx?.activeUsers as string[]) ?? [];
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

  async getAllChannelContexts(): Promise<ChannelContext[]> {
    const rows = await this.prisma.channelContext.findMany();
    return rows.map((row) => ({
      channelId: row.channelId,
      channelName: row.channelName,
      channelType: row.channelType,
      recentTopics: (row.recentTopics as string[]) ?? [],
      activeUsers: (row.activeUsers as string[]) ?? [],
      conversationTone: (row.conversationTone as any) ?? 'casual',
      lastActivity: Number(row.lastActivity),
    }));
  }

  // ======================= SERVER PROFILES =======================
  async createServerProfile(profile: ServerContext): Promise<boolean> {
    try {
      await this.prisma.serverProfile.upsert({
        where: { serverId: profile.serverId },
        create: {
          serverId: profile.serverId,
          serverName: profile.serverName,
          ownerId: profile.ownerId ?? null,
          memberCount: profile.memberCount ?? 0,
          lastActivity: BigInt(profile.lastActivity),
          recentEvents: profile.recentEvents,
        },
        update: {
          serverName: profile.serverName,
          ownerId: profile.ownerId ?? null,
          memberCount: profile.memberCount ?? 0,
          lastActivity: BigInt(profile.lastActivity),
          recentEvents: profile.recentEvents,
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
        lastActivity: Number(row.lastActivity),
      };
    } catch (error) {
      Logger.error('Failed to get server profile:', error);
      return null;
    }
  }

  async updateServerProfile(serverId: string, updates: Partial<ServerContext>): Promise<boolean> {
    try {
      await this.prisma.serverProfile.update({
        where: { serverId },
        data: {
          serverName: updates.serverName,
          ownerId: updates.ownerId,
          memberCount: updates.memberCount,
          lastActivity: updates.lastActivity !== undefined ? BigInt(updates.lastActivity) : undefined,
          recentEvents: updates.recentEvents,
        },
      });
      return true;
    } catch (error) {
      Logger.error('Failed to update server profile:', error);
      return false;
    }
  }

  async addServerRecentEvent(serverId: string, event: string, detail?: string): Promise<boolean> {
    try {
      const profile = await this.prisma.serverProfile.findUnique({ where: { serverId } });
      const events = (profile?.recentEvents as string[]) ?? [];
      events.unshift(detail ? `${event}: ${detail}` : event);
      await this.prisma.serverProfile.upsert({
        where: { serverId },
        update: { recentEvents: events, lastActivity: BigInt(Date.now()) },
        create: {
          serverId,
          serverName: '',
          ownerId: null,
          memberCount: 0,
          lastActivity: BigInt(Date.now()),
          recentEvents: events,
        },
      });
      return true;
    } catch (error) {
      Logger.error('Failed to add server recent event:', error);
      return false;
    }
  }

  async getServerRecentEvents(serverId: string, limit = 10): Promise<string[]> {
    const profile = await this.prisma.serverProfile.findUnique({ where: { serverId } });
    const events = (profile?.recentEvents as string[]) ?? [];
    return events.slice(0, limit);
  }

  // ======================= CONVERSATION HISTORY =======================
  async addConversationMessage(message: ConversationMessage): Promise<number | null> {
    try {
      const row = await this.prisma.conversationHistory.create({
        data: {
          channelId: message.channelId,
          userId: message.userId ?? null,
          role: message.role,
          content: message.content,
          timestamp: BigInt(message.timestamp),
          author: message.author ?? null,
          relevanceScore: message.relevanceScore ?? 0,
        },
      });
      return row.id;
    } catch (error) {
      Logger.error('Failed to add conversation message:', error);
      return null;
    }
  }

  async getConversationHistory(channelId: string, limit = 20): Promise<ConversationMessage[]> {
    const rows = await this.prisma.conversationHistory.findMany({
      where: { channelId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      channelId: r.channelId,
      userId: r.userId ?? undefined,
      role: r.role as 'user' | 'assistant',
      content: r.content,
      timestamp: Number(r.timestamp),
      author: r.author ?? undefined,
      relevanceScore: r.relevanceScore ?? undefined,
    }));
  }

  async deleteOldConversationHistory(olderThanDays: number): Promise<number> {
    const threshold = BigInt(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const result = await this.prisma.conversationHistory.deleteMany({
      where: { timestamp: { lt: threshold } },
    });
    return result.count;
  }

  // ======================= STATS & CLEANUP =======================
  async getUserStats(userId: string): Promise<any> {
    const messages = await this.prisma.conversationHistory.count({ where: { userId } });
    return { messages };
  }

  async getChannelStats(channelId: string): Promise<any> {
    const messages = await this.prisma.conversationHistory.count({ where: { channelId } });
    return { messages };
  }

  async getDatabaseStats(): Promise<any> {
    const [users, channels, servers, messages] = await Promise.all([
      this.prisma.userProfile.count(),
      this.prisma.channelContext.count(),
      this.prisma.serverProfile.count(),
      this.prisma.conversationHistory.count(),
    ]);
    return { users, channels, servers, messages };
  }

  async cleanupOldData(olderThanDays: number): Promise<void> {
    await this.deleteOldConversationHistory(olderThanDays);
  }
}
