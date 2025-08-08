import { Client, Events } from "discord.js";
import { Logger } from "../utils/logger.js";
import { ChannelManager } from "../utils/channelManager.js";
import { DatabaseCRUD } from "../database/operations.js";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    Logger.success("Discord AI Chatbot is ready!");
    Logger.info(`Logged in as: ${client.user?.tag}`);
    Logger.info(`Connected to ${client.guilds.cache.size} server(s)`);
    Logger.info(`Serving ${client.users.cache.size} users`);

    // Initialize and log channel configuration
    const channelManager = new ChannelManager(client);
    channelManager.logConfiguration();

    const stats = channelManager.getChannelStats();
    Logger.info(
      `📊 Channel Stats: ${stats.totalChannels} total, ${stats.listenChannels} listening, ${stats.ignoredChannels} ignored`
    );

    // Set bot activity status
    client.user?.setActivity("Learning about server members", {
      type: 3, // Watching
    });

    // Initialize Database Manager FIRST (AI Manager depends on it)
    const databaseManager = (client as any).databaseManager;
    if (databaseManager) {
      Logger.info("🗄️ Initializing Database Manager...");
      try {
        const dbInitialized = await databaseManager.initialize();
        if (dbInitialized) {
          Logger.success("✅ Database Manager initialized successfully");

          // Log database statistics
          const dbStats = databaseManager.getStats();
          if (dbStats) {
            Logger.info(
              `📊 Database: ${dbStats.sizeMB}MB, ${dbStats.tables} tables, ${dbStats.journalMode} mode`
            );
          }

          // Create server profiles for connected guilds
          const crud = new DatabaseCRUD(databaseManager.getDatabase());
          for (const guild of client.guilds.cache.values()) {
            await crud.createServerProfile({
              serverId: guild.id,
              serverName: guild.name,
              ownerId: guild.ownerId,
              memberCount: guild.memberCount,
              recentEvents: [],
              lastActivity: Math.floor(Date.now() / 1000),
            });
          }
        } else {
          Logger.error("❌ Database Manager initialization failed");
        }
      } catch (error) {
        Logger.error("❌ Error initializing Database Manager:", error);
      }
    } else {
      Logger.warn("⚠️ Database Manager not found on client");
    }

    // Initialize AI Manager AFTER Database Manager
    const aiManager = (client as any).aiManager;
    if (aiManager) {
      Logger.info("🧠 Initializing AI Manager...");
      try {
        const aiInitialized = await aiManager.initialize();
        if (aiInitialized) {
          Logger.success("✅ AI Manager initialized successfully");
        } else {
          Logger.error("❌ AI Manager initialization failed");
        }
      } catch (error) {
        Logger.error("❌ Error initializing AI Manager:", error);
      }
    } else {
      Logger.warn("⚠️ AI Manager not found on client");
    }

    // Initialize TTS Manager
    const ttsManager = (client as any).ttsManager;
    if (ttsManager) {
      Logger.info("🔊 Initializing TTS Manager...");
      try {
        const ttsInitialized = await ttsManager.initialize();
        if (ttsInitialized) {
          Logger.success("✅ TTS Manager initialized successfully");

          // Test TTS pipeline
          const pipelineTest = await ttsManager.testTTSPipeline();
          if (pipelineTest) {
            Logger.success("✅ TTS pipeline test passed");
          } else {
            Logger.warn("⚠️ TTS pipeline test failed");
          }
        } else {
          Logger.error("❌ TTS Manager initialization failed");
        }
      } catch (error) {
        Logger.error("❌ Error initializing TTS Manager:", error);
      }
    } else {
      Logger.warn("⚠️ TTS Manager not found on client");
    }

    Logger.success("🎯 Bot is now listening for messages and learning...");
    Logger.info(
      '💡 Send "!test" in your configured channel to verify functionality'
    );
    Logger.info('🧠 Send "!ai-test" to test AI response generation');
    Logger.info(
      "🔊 AI responses will be converted to speech and played in voice channels"
    );
    Logger.info(
      "👋 Mention the bot or reply to its messages to trigger AI responses with TTS"
    );
  },
};
