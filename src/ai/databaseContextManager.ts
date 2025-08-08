import { Logger } from "../utils/logger.js";
import type { ProcessedMessage } from "../utils/messageProcessor.js";
import type { DatabaseManager } from "../database/databaseManager.js";
import { DatabaseCRUD } from "../database/operations.js";
import type {
  UserProfile,
  ChannelContext,
  MessageContext,
  ServerContext,
} from "./contextManager.js";

/**
 * Database-backed Context Manager
 * Replaces in-memory storage with persistent database operations
 */
export class DatabaseContextManager {
  private crud: DatabaseCRUD;
  private databaseManager: DatabaseManager;

  constructor(databaseManager: DatabaseManager) {
    this.databaseManager = databaseManager;
    this.crud = new DatabaseCRUD(databaseManager.getDatabase());
  }

  /**
   * Build comprehensive context for AI response generation
   */
  async buildMessageContext(
    message: ProcessedMessage,
    conversationHistory: Array<{
      role: "user" | "assistant";
      content: string;
      timestamp: number;
      author?: string;
    }>
  ): Promise<MessageContext> {
    // Get or create user profile
    const userProfile = await this.getUserProfile(
      message.author.id,
      message.author.username
    );

    // Get or create channel context
    const channelContext = await this.getChannelContext(
      message.channel.id,
      message.channel.name
    );

    // Get or create server context if available
    const serverContext = message.guild.id
      ? await this.getServerContext(
          message.guild.id,
          message.guild.name || "Unknown"
        )
      : undefined;

    // Extract topics from recent conversation
    const recentTopics = this.extractTopics(conversationHistory);

    // Calculate relevance score
    const relevanceScore = this.calculateRelevanceScore(
      message,
      userProfile,
      channelContext
    );

    // Identify contextual cues
    const contextualCues = this.identifyContextualCues(
      message,
      conversationHistory
    );

    // Update profiles with new information (async)
    await this.updateUserProfile(userProfile, message);
    await this.updateChannelContext(channelContext, message);
    if (serverContext) {
      await this.updateServerContext(serverContext, message);
    }

    // Store conversation message in database
    await this.crud.addConversationMessage({
      channelId: message.channel.id,
      userId: message.author.id,
      role: "user",
      content: message.cleanContent,
      timestamp: message.timestamp,
      author: message.author.username,
      relevanceScore,
    });

    return {
      message,
      userProfile,
      channelContext,
      serverContext,
      conversationHistory: conversationHistory.map((msg) => ({
        ...msg,
        topics: this.extractTopicsFromMessage(msg.content),
      })),
      relevanceScore,
      contextualCues,
    };
  }

  /**
   * Store assistant response in conversation history
   */
  async storeAssistantResponse(
    channelId: string,
    content: string,
    timestamp: number,
    relevanceScore: number = 0.0
  ): Promise<void> {
    await this.crud.addConversationMessage({
      channelId,
      userId: null, // Bot message
      role: "assistant",
      content,
      timestamp,
      author: "Bot",
      relevanceScore,
    });
  }

  /**
   * Get or create user profile from database
   */
  private async getUserProfile(
    userId: string,
    username: string
  ): Promise<UserProfile> {
    let profile = await this.crud.getUserProfile(userId);

    if (!profile) {
      profile = {
        userId,
        username,
        interests: [],
        personality: [],
        recentTopics: [],
        interactionCount: 0,
        lastSeen: Date.now(),
        bio: undefined,
        goals: undefined,
        preferences: undefined,
        notes: undefined,
      };

      await this.crud.createUserProfile(profile);
      Logger.debug(`📝 Created new user profile for ${username}`);
    }

    return profile;
  }

  /**
   * Get or create channel context from database
   */
  private async getChannelContext(
    channelId: string,
    channelName: string
  ): Promise<ChannelContext> {
    let context = await this.crud.getChannelContext(channelId);

    if (!context) {
      context = {
        channelId,
        channelName,
        channelType: "text",
        recentTopics: [],
        activeUsers: [],
        conversationTone: "casual",
        lastActivity: Date.now(),
      };

      await this.crud.createChannelContext(context);
      Logger.debug(`📝 Created new channel context for #${channelName}`);
    }

    return context;
  }

  /**
   * Get or create server context from database
   */
  private async getServerContext(
    serverId: string,
    serverName: string
  ) {
    let context = await this.crud.getServerProfile(serverId);

    if (!context) {
      context = {
        serverId,
        serverName,
        recentEvents: [],
        lastActivity: Date.now(),
      };
      await this.crud.createServerProfile(context);
      Logger.debug(`🏠 Created new server context for ${serverName}`);
    }

    // Always fetch recent events
    context.recentEvents = await this.crud.getServerRecentEvents(serverId, 10);

    return context;
  }

  /**
   * Update server context with new message data
   */
  private async updateServerContext(
    context: ServerContext,
    message: ProcessedMessage
  ) {
    const updates = {
      serverName: context.serverName,
      lastActivity: message.timestamp,
    };
    await this.crud.updateServerProfile(context.serverId, updates);
    await this.crud.addServerRecentEvent(
      context.serverId,
      "message",
      message.author.username
    );

    context.lastActivity = message.timestamp;
    context.recentEvents.unshift(`message:${message.author.username}`);
    context.recentEvents = context.recentEvents.slice(0, 10);
  }

  /**
   * Extract topics from conversation history
   */
  private extractTopics(
    conversationHistory: Array<{ content: string }>
  ): string[] {
    const topics = new Set<string>();

    for (const message of conversationHistory.slice(-10)) {
      // Last 10 messages
      const messageTopics = this.extractTopicsFromMessage(message.content);
      messageTopics.forEach((topic) => topics.add(topic));
    }

    return Array.from(topics);
  }

  /**
   * Extract topics from a single message using keyword analysis
   */
  private extractTopicsFromMessage(content: string): string[] {
    const topics: string[] = [];
    const cleanContent = content.toLowerCase();

    // Technology topics (Vietnamese + English)
    const techKeywords = [
      // Vietnamese
      "công nghệ",
      "lập trình",
      "phần mềm",
      "ứng dụng",
      "website",
      "web",
      "app",
      "máy tính",
      "điện thoại",
      "smartphone",
      "laptop",
      "pc",
      "android",
      "ios",
      "trí tuệ nhân tạo",
      "ai",
      "machine learning",
      "deep learning",
      // English (still common in Vietnamese tech discussions)
      "javascript",
      "typescript",
      "python",
      "react",
      "discord",
      "bot",
      "programming",
      "code",
      "coding",
      "github",
      "api",
      "html",
      "css",
      "nodejs",
    ];
    techKeywords.forEach((keyword) => {
      if (cleanContent.includes(keyword)) {
        topics.push(`tech:${keyword}`);
      }
    });

    // Gaming topics (Vietnamese + English)
    const gameKeywords = [
      // Vietnamese
      "game",
      "chơi game",
      "gaming",
      "trò chơi",
      "game mobile",
      "game online",
      "liên minh huyền thoại",
      "lol",
      "pubg",
      "free fire",
      "valorant",
      "fifa",
      "pes",
      "minecraft",
      "roblox",
      "among us",
      // English gaming terms
      "steam",
      "xbox",
      "playstation",
      "nintendo",
      "switch",
      "ps5",
      "ps4",
    ];
    gameKeywords.forEach((keyword) => {
      if (cleanContent.includes(keyword)) {
        topics.push(`gaming:${keyword}`);
      }
    });

    // General interests (Vietnamese)
    const interestKeywords = [
      // Entertainment
      "nhạc",
      "âm nhạc",
      "bài hát",
      "ca sĩ",
      "nhạc sĩ",
      "kpop",
      "vpop",
      "phim",
      "phim ảnh",
      "điện ảnh",
      "netflix",
      "youtube",
      "tiktok",
      "sách",
      "đọc sách",
      "tiểu thuyết",
      "truyện",
      "manga",
      "anime",
      // Food & Lifestyle
      "ăn",
      "thức ăn",
      "món ăn",
      "nấu ăn",
      "đồ ăn",
      "quán ăn",
      "nhà hàng",
      "cafe",
      "cà phê",
      "trà",
      "bánh",
      "phở",
      "bún",
      "cơm",
      "du lịch",
      "travel",
      "đi chơi",
      "nghỉ dưỡng",
      "vacation",
      "nghệ thuật",
      "art",
      "vẽ",
      "painting",
      "nhiếp ảnh",
      "photography",
      // Sports & Health
      "thể thao",
      "bóng đá",
      "football",
      "tennis",
      "badminton",
      "cầu lông",
      "gym",
      "tập gym",
      "fitness",
      "yoga",
      "chạy bộ",
      "running",
      "sức khỏe",
    ];
    interestKeywords.forEach((keyword) => {
      if (cleanContent.includes(keyword)) {
        topics.push(`interest:${keyword}`);
      }
    });

    // Emotions/tone (Vietnamese)
    const emotionKeywords = [
      // Positive emotions
      "vui",
      "vui vẻ",
      "hạnh phúc",
      "happy",
      "vui mừng",
      "phấn khích",
      "excited",
      "yêu",
      "thích",
      "love",
      "like",
      "tuyệt vời",
      "amazing",
      "tốt",
      "good",
      "hài lòng",
      "satisfied",
      "thoải mái",
      "comfortable",
      "chill",
      "relax",
      // Negative emotions
      "buồn",
      "sad",
      "khóc",
      "cry",
      "thất vọng",
      "disappointed",
      "tức giận",
      "angry",
      "giận",
      "mad",
      "bực mình",
      "annoyed",
      "lo lắng",
      "worried",
      "anxiety",
      "stress",
      "căng thẳng",
      "nervous",
      "mệt",
      "tired",
      "mệt mỏi",
      "exhausted",
      "chán",
      "bored",
      "bối rối",
      "confused",
      "hoang mang",
      "lost",
      "không hiểu",
    ];
    emotionKeywords.forEach((keyword) => {
      if (cleanContent.includes(keyword)) {
        topics.push(`emotion:${keyword}`);
      }
    });

    // Vietnamese-specific topics
    const vietnameseTopics = [
      // Education
      "học",
      "học tập",
      "study",
      "trường",
      "school",
      "university",
      "đại học",
      "thi",
      "exam",
      "kiểm tra",
      "test",
      "bài tập",
      "homework",
      // Work
      "làm việc",
      "work",
      "job",
      "công việc",
      "career",
      "nghề nghiệp",
      "công ty",
      "company",
      "office",
      "văn phòng",
      "meeting",
      "họp",
      // Daily life
      "gia đình",
      "family",
      "bạn bè",
      "friends",
      "người yêu",
      "boyfriend",
      "girlfriend",
      "thời tiết",
      "weather",
      "nóng",
      "hot",
      "lạnh",
      "cold",
      "mưa",
      "rain",
      "shopping",
      "mua sắm",
      "tiền",
      "money",
      "giá",
      "price",
    ];
    vietnameseTopics.forEach((keyword) => {
      if (cleanContent.includes(keyword)) {
        topics.push(`vietnamese:${keyword}`);
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
    if (message.messageType === "mention") score += 0.3;
    if (message.isReply) score += 0.2;

    // Higher score for questions
    if (message.cleanContent.includes("?")) score += 0.2;

    // Higher score for users we've interacted with before
    if (userProfile.interactionCount > 0) score += 0.1;

    // Higher score for recent activity in channel
    const timeSinceLastActivity = Date.now() - channelContext.lastActivity;
    if (timeSinceLastActivity < 300000) score += 0.1; // Within 5 minutes

    // Lower score for very short messages
    if (message.cleanContent.length < 10) score -= 0.2;

    // Higher score for messages with common interests
    const messageTopics = this.extractTopicsFromMessage(message.cleanContent);
    const commonTopics = messageTopics.filter(
      (topic) =>
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
    if (hour < 6 || hour > 22) cues.push("late-night");
    if (hour >= 6 && hour < 12) cues.push("morning");
    if (hour >= 12 && hour < 17) cues.push("afternoon");
    if (hour >= 17 && hour < 22) cues.push("evening");

    // Message type cues
    if (message.messageType === "mention") cues.push("mentioned");
    if (message.isReply) cues.push("reply");

    // Content cues
    const content = message.cleanContent.toLowerCase();
    if (content.includes("help") || content.includes("?"))
      cues.push("needs-help");
    if (content.includes("thanks") || content.includes("thank"))
      cues.push("grateful");
    if (content.includes("hello") || content.includes("hi"))
      cues.push("greeting");
    if (content.includes("bye") || content.includes("goodbye"))
      cues.push("farewell");

    // Conversation flow cues
    if (conversationHistory.length === 0) cues.push("first-interaction");
    if (conversationHistory.length > 5) cues.push("ongoing-conversation");

    // Recent context cues
    const recentMessages = conversationHistory.slice(-3);
    if (recentMessages.some((msg) => msg.author === message.author.username)) {
      cues.push("continuing-user");
    }

    return cues;
  }

  /**
   * Update user profile with new interaction data
   */
  private async updateUserProfile(
    profile: UserProfile,
    message: ProcessedMessage
  ): Promise<void> {
    // Update basic profile data
    const updates: Partial<UserProfile> = {
      interactionCount: profile.interactionCount + 1,
      lastSeen: message.timestamp,
      username: message.author.username, // Update in case of username change
    };

    // Extract and add topics to recent topics
    const messageTopics = this.extractTopicsFromMessage(message.cleanContent);
    const newTopics = [...profile.recentTopics];

    messageTopics.forEach((topic) => {
      if (!newTopics.includes(topic)) {
        newTopics.push(topic);
      }
    });

    // Keep only last 20 topics
    updates.recentTopics = newTopics.slice(-20);

    // Update personality traits based on message patterns
    const newPersonality = [...profile.personality];
    const personalityUpdates = this.analyzePersonalityTraits(message);

    personalityUpdates.forEach((trait) => {
      if (!newPersonality.includes(trait)) {
        newPersonality.push(trait);
      }
    });

    // Keep only last 10 traits
    updates.personality = newPersonality.slice(-10);

    // Update profile in database
    await this.crud.updateUserProfile(profile.userId, updates);
  }

  /**
   * Analyze personality traits based on message analysis
   */
  private analyzePersonalityTraits(message: ProcessedMessage): string[] {
    const traits: string[] = [];
    const content = message.cleanContent.toLowerCase();

    // Detect personality traits
    if (
      content.includes("lol") ||
      content.includes("haha") ||
      content.includes("😂")
    ) {
      traits.push("humorous");
    }

    if (content.includes("?") && content.length > 20) {
      traits.push("inquisitive");
    }

    if (content.includes("please") || content.includes("thank")) {
      traits.push("polite");
    }

    if (
      content.includes("code") ||
      content.includes("programming") ||
      content.includes("tech")
    ) {
      traits.push("technical");
    }

    return traits;
  }

  /**
   * Update channel context with new message data
   */
  private async updateChannelContext(
    context: ChannelContext,
    message: ProcessedMessage
  ): Promise<void> {
    // Update basic context data
    const updates: Partial<ChannelContext> = {
      lastActivity: message.timestamp,
    };

    // Add user to active users
    const newActiveUsers = [...context.activeUsers];
    if (!newActiveUsers.includes(message.author.id)) {
      newActiveUsers.push(message.author.id);
    }

    // Keep only last 20 active users
    updates.activeUsers = newActiveUsers.slice(-20);

    // Update recent topics
    const messageTopics = this.extractTopicsFromMessage(message.cleanContent);
    const newTopics = [...context.recentTopics];

    messageTopics.forEach((topic) => {
      if (!newTopics.includes(topic)) {
        newTopics.push(topic);
      }
    });

    // Keep only last 15 topics
    updates.recentTopics = newTopics.slice(-15);

    // Update context in database
    await this.crud.updateChannelContext(context.channelId, updates);

    // Update user activity tracking
    await this.crud.addChannelActiveUser(context.channelId, message.author.id);
  }

  /**
   * Get context summary for AI prompt
   */
  getContextSummary(context: MessageContext): string {
    const parts: string[] = [];

    if (context.userProfile) {
      const profile = context.userProfile;
      parts.push(
        `User ${profile.username} (${profile.interactionCount} interactions)`
      );

      if (profile.personality.length > 0) {
        parts.push(`Personality: ${profile.personality.join(", ")}`);
      }

      if (profile.recentTopics.length > 0) {
        const topics = profile.recentTopics.slice(-5).join(", ");
        parts.push(`Recent interests: ${topics}`);
      }
    }

    if (context.channelContext.recentTopics.length > 0) {
      const topics = context.channelContext.recentTopics.slice(-3).join(", ");
      parts.push(`Channel topics: ${topics}`);
    }

    if (context.serverContext && context.serverContext.recentEvents.length > 0) {
      const events = context.serverContext.recentEvents.slice(0, 3).join(", ");
      parts.push(`Server events: ${events}`);
    }

    if (context.contextualCues.length > 0) {
      parts.push(`Context: ${context.contextualCues.join(", ")}`);
    }

    parts.push(`Relevance: ${Math.round(context.relevanceScore * 100)}%`);

    return parts.join(" | ");
  }

  /**
   * Check if response should be generated based on relevance
   */
  shouldGenerateResponse(
    context: MessageContext,
    threshold: number = 0.6
  ): boolean {
    // Always respond to mentions and direct replies
    if (context.message.messageType === "mention" || context.message.isReply) {
      return true;
    }

    // Respond based on relevance score and provided threshold
    return context.relevanceScore > threshold;
  }

  /**
   * Get conversation history from database
   */
  async getConversationHistory(
    channelId: string,
    limit: number = 50
  ): Promise<
    Array<{
      role: "user" | "assistant";
      content: string;
      timestamp: number;
      author?: string;
      topics?: string[];
    }>
  > {
    const messages = await this.crud.getConversationHistory(channelId, limit);

    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      author: msg.author || undefined,
      topics: this.extractTopicsFromMessage(msg.content),
    }));
  }

  /**
   * Get statistics about context management
   */
  async getStats() {
    const dbStats = await this.crud.getDatabaseStats();
    return {
      userProfiles: dbStats?.users || 0,
      channelContexts: dbStats?.channels || 0,
      serverContexts: dbStats?.servers || 0,
      totalMessages: dbStats?.messages || 0,
      totalInteractions: dbStats?.interests || 0, // Approximate
      databaseStats: dbStats,
    };
  }

  /**
   * Clean up old data to manage database size
   */
  async cleanup(olderThanDays: number = 30): Promise<void> {
    Logger.info(
      `🧹 Starting database-backed context cleanup (older than ${olderThanDays} days)...`
    );

    await this.crud.cleanupOldData(olderThanDays);

    const stats = await this.getStats();
    Logger.info(
      `🧹 Context cleanup completed. ${stats.userProfiles} users, ${stats.channelContexts} channels, ${stats.serverContexts} servers, ${stats.totalMessages} messages`
    );
  }

  /**
   * Get user profile by ID
   */
  async getUserProfileById(userId: string): Promise<UserProfile | null> {
    return await this.crud.getUserProfile(userId);
  }

  /**
   * Get channel context by ID
   */
  async getChannelContextById(
    channelId: string
  ): Promise<ChannelContext | null> {
    return await this.crud.getChannelContext(channelId);
  }

  /**
   * Get all user profiles
   */
  async getAllUserProfiles(): Promise<UserProfile[]> {
    return await this.crud.getAllUserProfiles();
  }

  /**
   * Get all channel contexts
   */
  async getAllChannelContexts(): Promise<ChannelContext[]> {
    return await this.crud.getAllChannelContexts();
  }
}
