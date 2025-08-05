import {
  Client,
  VoiceChannel,
  GuildMember,
  VoiceState,
  PermissionsBitField,
} from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnection,
  AudioPlayer,
  entersState,
  getVoiceConnection,
  VoiceConnectionStatus,
  StreamType,
} from "@discordjs/voice";
import { createReadStream } from "fs";
import { Logger } from "./logger.js";
import { config } from "../config/bot.js";

export interface VoicePlaybackResult {
  success: boolean;
  error?: string;
  duration?: number;
}

export class VoiceManager {
  private client: Client;
  private connections = new Map<string, VoiceConnection>();
  private players = new Map<string, AudioPlayer>();

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Join a voice channel
   */
  async joinVoiceChannel(
    guildId: string,
    channelId?: string
  ): Promise<VoiceConnection | null> {
    try {
      // Use configured voice channel if no specific channel provided
      const targetChannelId = channelId || config.voiceChannelId;

      if (!targetChannelId) {
        Logger.error("❌ No voice channel ID configured");
        return null;
      }

      // Get the voice channel
      const channel = await this.client.channels.fetch(targetChannelId);
      if (!channel || !(channel instanceof VoiceChannel)) {
        Logger.error(
          `❌ Voice channel not found or invalid: ${targetChannelId}`
        );
        return null;
      }

      // Check if bot has permissions
      const permissions = channel.permissionsFor(this.client.user!);
      if (
        !permissions?.has([
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.Speak,
        ])
      ) {
        Logger.error(
          "❌ Bot lacks permission to connect or speak in voice channel"
        );
        return null;
      }

      // Check if already connected to this channel
      const existingConnection = getVoiceConnection(guildId);
      if (
        existingConnection &&
        existingConnection.joinConfig.channelId === targetChannelId
      ) {
        // Check if connection is in a good state
        if (
          existingConnection.state.status === VoiceConnectionStatus.Ready ||
          existingConnection.state.status === VoiceConnectionStatus.Connecting
        ) {
          Logger.info(`🔊 Already connected to voice channel: ${channel.name}`);
          return existingConnection;
        } else {
          // Connection exists but is in bad state, destroy it
          Logger.info("🔄 Existing connection in bad state, recreating...");
          existingConnection.destroy();
          this.connections.delete(guildId);
        }
      }

      // Join the voice channel
      Logger.info(`🔊 Joining voice channel: ${channel.name}`);
      const connection = joinVoiceChannel({
        channelId: targetChannelId,
        guildId: guildId,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      // Store connection
      this.connections.set(guildId, connection);

      // Set up connection event handlers
      connection.on("stateChange", (oldState, newState) => {
        Logger.info(
          `🔊 Voice connection state changed: ${oldState.status} -> ${newState.status}`
        );

        // Handle disconnection
        if (newState.status === VoiceConnectionStatus.Disconnected) {
          Logger.warn(
            "🔊 Voice connection disconnected, attempting to reconnect..."
          );
          // The connection will automatically attempt to reconnect
        } else if (newState.status === VoiceConnectionStatus.Destroyed) {
          Logger.info("🔊 Voice connection destroyed");
          this.connections.delete(guildId);
        }
      });

      connection.on("error", (error) => {
        Logger.error("❌ Voice connection error:", error);
      });

      // Wait for connection to be ready with longer timeout
      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30000);
        Logger.success(`✅ Successfully joined voice channel: ${channel.name}`);
        return connection;
      } catch (timeoutError) {
        Logger.error("❌ Connection timeout, destroying connection");
        connection.destroy();
        this.connections.delete(guildId);
        throw new Error("Connection timeout - please try again");
      }
    } catch (error) {
      Logger.error("❌ Failed to join voice channel:", error);
      return null;
    }
  }

  /**
   * Play audio file in voice channel
   */
  async playAudioFile(
    guildId: string,
    audioFilePath: string
  ): Promise<VoicePlaybackResult> {
    try {
      // Ensure we're connected to a voice channel
      let connection = this.connections.get(guildId);
      if (!connection) {
        const newConnection = await this.joinVoiceChannel(guildId);
        if (!newConnection) {
          return {
            success: false,
            error: "Failed to connect to voice channel",
          };
        }
        connection = newConnection;
      }

      // Create audio player if needed
      let player = this.players.get(guildId);
      if (!player) {
        player = createAudioPlayer();
        this.players.set(guildId, player);

        // Set up player event handlers
        player.on(AudioPlayerStatus.Playing, () => {
          Logger.info("🎵 Audio playback started");
        });

        player.on(AudioPlayerStatus.Idle, () => {
          Logger.info("🎵 Audio playback finished");
        });

        player.on("error", (error) => {
          Logger.error("❌ Audio player error:", error);
        });

        // Subscribe connection to player
        connection.subscribe(player);
      }

      // Create audio resource from file
      const resource = createAudioResource(createReadStream(audioFilePath), {
        inputType: StreamType.Arbitrary,
      });

      // Play the audio
      Logger.info(`🎵 Playing audio file: ${audioFilePath}`);
      player.play(resource);

      // Wait for playback to finish
      const startTime = Date.now();
      await entersState(player, AudioPlayerStatus.Idle, 30000); // 30 second timeout
      const duration = Date.now() - startTime;

      Logger.success(`✅ Audio playback completed in ${duration}ms`);

      return {
        success: true,
        duration,
      };
    } catch (error) {
      Logger.error("❌ Audio playback failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown playback error",
      };
    }
  }

  /**
   * Leave voice channel
   */
  async leaveVoiceChannel(guildId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(guildId);
      if (connection) {
        connection.destroy();
        this.connections.delete(guildId);
        Logger.info("🔊 Left voice channel");
        return true;
      }
      return false;
    } catch (error) {
      Logger.error("❌ Failed to leave voice channel:", error);
      return false;
    }
  }

  /**
   * Stop current audio playback
   */
  stopPlayback(guildId: string): boolean {
    try {
      const player = this.players.get(guildId);
      if (player) {
        player.stop();
        Logger.info("⏹️ Audio playback stopped");
        return true;
      }
      return false;
    } catch (error) {
      Logger.error("❌ Failed to stop playback:", error);
      return false;
    }
  }

  /**
   * Check if bot is connected to voice channel
   */
  isConnected(guildId: string): boolean {
    const connection = this.connections.get(guildId);
    return (
      connection !== undefined &&
      connection.state.status !== VoiceConnectionStatus.Destroyed &&
      connection.state.status !== VoiceConnectionStatus.Disconnected
    );
  }

  /**
   * Get voice channel that user is in
   */
  getUserVoiceChannel(member: GuildMember): VoiceChannel | null {
    const voiceState = member.voice;
    if (voiceState && voiceState.channel instanceof VoiceChannel) {
      return voiceState.channel;
    }
    return null;
  }

  /**
   * Check if user is in the same voice channel as bot
   */
  isUserInSameChannel(member: GuildMember, guildId: string): boolean {
    const connection = this.connections.get(guildId);
    if (!connection) return false;

    const userChannel = this.getUserVoiceChannel(member);
    if (!userChannel) return false;

    return userChannel.id === connection.joinConfig.channelId;
  }

  /**
   * Get voice manager statistics
   */
  getStats() {
    return {
      activeConnections: this.connections.size,
      activePlayers: this.players.size,
      connections: Array.from(this.connections.keys()),
      configuredVoiceChannel: config.voiceChannelId,
    };
  }

  /**
   * Cleanup all connections and players
   */
  cleanup() {
    try {
      // Stop all players
      for (const [guildId, player] of this.players.entries()) {
        player.stop();
        this.players.delete(guildId);
      }

      // Destroy all connections
      for (const [guildId, connection] of this.connections.entries()) {
        connection.destroy();
        this.connections.delete(guildId);
      }

      Logger.info("🧹 Voice manager cleanup completed");
    } catch (error) {
      Logger.error("❌ Voice manager cleanup failed:", error);
    }
  }
}
