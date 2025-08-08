import type { ProcessedMessage } from "../utils/messageProcessor.js";
import type { UserProfile, ChannelContext } from "./contextManager.js";
import { topicKeywords } from "./topicKeywords.js";

export function extractTopicsFromMessage(content: string): string[] {
  const topics: string[] = [];
  const cleanContent = content.toLowerCase();

  for (const [category, keywords] of Object.entries(topicKeywords)) {
    keywords.forEach((keyword) => {
      if (cleanContent.includes(keyword)) {
        topics.push(`${category}:${keyword}`);
      }
    });
  }

  return topics;
}

export function calculateRelevanceScore(
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
  const messageTopics = extractTopicsFromMessage(message.cleanContent);
  const commonTopics = messageTopics.filter(
    (topic) =>
      userProfile.recentTopics.includes(topic) ||
      channelContext.recentTopics.includes(topic)
  );
  score += commonTopics.length * 0.1;

  return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
}

export function identifyContextualCues(
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
  if (content.includes("help") || content.includes("?")) cues.push("needs-help");
  if (content.includes("thanks") || content.includes("thank"))
    cues.push("grateful");
  if (content.includes("hello") || content.includes("hi")) cues.push("greeting");
  if (content.includes("bye") || content.includes("goodbye")) cues.push("farewell");

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
