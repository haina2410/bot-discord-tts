import OpenAI from "openai";
import { config } from "../config/bot.js";
import { Logger } from "../utils/logger.js";
import type { ProcessedMessage } from "../utils/messageProcessor.js";

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

export interface ConversationContext {
  userId: string;
  username: string;
  channelId: string;
  channelName: string;
  guildId?: string;
  guildName?: string;
  recentMessages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    author?: string;
  }>;
  userContext?: string; // From database - what we know about this user
}

export class OpenAIService {
  private client: OpenAI;
  private model: string = "gpt-4.1-mini"; // Cost-effective model for chat
  private maxTokens: number = 500;
  private temperature: number = 0.7;

  constructor() {
    if (!config.openaiApiKey) {
      throw new Error(
        "OpenAI API key not configured. Please set OPENAI_API_KEY in your environment."
      );
    }

    this.client = new OpenAI({
      apiKey: config.openaiApiKey,
    });

    Logger.info("✅ OpenAI service initialized");
  }

  /**
   * Generate AI response based on message and context
   */
  async generateResponse(
    message: ProcessedMessage,
    context: ConversationContext
  ): Promise<AIResponse> {
    try {
      Logger.info(`🧠 Generating AI response for ${message.author.username}`);

      const systemPrompt = this.buildSystemPrompt(context);
      const messages = this.buildMessageHistory(message, context);

      const startTime = Date.now();
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        user: message.author.id, // For abuse monitoring
      });

      const duration = Date.now() - startTime;
      const response = completion.choices[0];

      if (!response?.message?.content) {
        throw new Error("No content in AI response");
      }

      const aiResponse: AIResponse = {
        content: response.message.content,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
        model: completion.model,
        finishReason: response.finish_reason || "unknown",
      };

      Logger.success(
        `✅ AI response generated in ${duration}ms (${aiResponse.usage?.totalTokens} tokens)`
      );
      return aiResponse;
    } catch (error) {
      Logger.error("❌ Error generating AI response:", error);
      throw new Error(
        `AI response generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Build system prompt based on bot personality and context
   */
  private buildSystemPrompt(context: ConversationContext): string {
    const botPersonality = `Bạn là một AI chatbot trong server Discord "${
      context.guildName || "Server Không Xác Định"
    }". Mục tiêu chính của bạn là học hỏi về các thành viên trong server và cung cấp những phản hồi hữu ích, phù hợp với ngữ cảnh.

Đặc điểm chính:
- Tính cách thân thiện và hấp dẫn
- Nhớ và tham khảo các cuộc trò chuyện trước đó khi phù hợp
- Đặt câu hỏi tiếp theo để tìm hiểu thêm về người dùng
- Cung cấp thông tin và hỗ trợ hữu ích
- Giữ câu trả lời ngắn gọn nhưng ý nghĩa (thường 1-3 câu)
- Sử dụng ngôn ngữ phù hợp với Discord và emoji khi thích hợp
- Tôn trọng và bao gồm mọi người
- Trả lời bằng tiếng Việt một cách tự nhiên và thân thiện

Ngữ cảnh hiện tại:
- Server: ${context.guildName || "Không xác định"}
- Kênh: #${context.channelName}
- Người dùng: ${context.username}

${
  context.userContext
    ? `Những gì bạn biết về ${context.username}: ${context.userContext}`
    : `Đây là lần tương tác đầu tiên của bạn với ${context.username}. Hãy cố gắng tìm hiểu điều gì đó về họ!`
}

Ghi nhớ: Phản hồi của bạn sẽ giúp xây dựng hồ sơ của người dùng này cho các tương tác trong tương lai. Chú ý đến sở thích, tính cách và preferences của họ.`;

    return botPersonality;
  }

  /**
   * Build message history for context
   */
  private buildMessageHistory(
    currentMessage: ProcessedMessage,
    context: ConversationContext
  ): Array<{ role: "user" | "assistant"; content: string }> {
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    // Add recent conversation history (limited to last 10 messages to manage token usage)
    const recentMessages = context.recentMessages.slice(-10);

    for (const msg of recentMessages) {
      messages.push({
        role: msg.role,
        content:
          msg.role === "user" ? `${msg.author}: ${msg.content}` : msg.content,
      });
    }

    // Add current message
    messages.push({
      role: "user",
      content: `${currentMessage.author.username}: ${currentMessage.cleanContent}`,
    });

    return messages;
  }

  /**
   * Test the OpenAI connection
   */
  async testConnection(): Promise<boolean> {
    try {
      Logger.info("🧪 Testing OpenAI connection...");

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          {
            role: "user",
            content: 'Say "Hello, I am working!" in exactly those words.',
          },
        ],
        max_tokens: 20,
        temperature: 0,
      });

      const response = completion.choices[0]?.message?.content;
      const isWorking = response?.includes("Hello, I am working!");

      if (isWorking) {
        Logger.success("✅ OpenAI connection test successful");
        return true;
      } else {
        Logger.warn(
          `⚠️ OpenAI connection test unexpected response: ${response}`
        );
        return false;
      }
    } catch (error) {
      Logger.error("❌ OpenAI connection test failed:", error);
      return false;
    }
  }

  /**
   * Get current model configuration
   */
  getModelInfo() {
    return {
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
    };
  }

  /**
   * Update model configuration
   */
  updateConfig(config: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }) {
    if (config.model !== undefined) this.model = config.model;
    if (config.maxTokens !== undefined) this.maxTokens = config.maxTokens;
    if (config.temperature !== undefined) this.temperature = config.temperature;

    Logger.info("🔧 OpenAI configuration updated:", this.getModelInfo());
  }
}
