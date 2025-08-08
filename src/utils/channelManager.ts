import { Client, TextChannel, ChannelType } from "discord.js";
import type { Channel } from "discord.js";
import { Logger } from "./logger.js";
import { config } from "../config/bot.js";

export class ChannelManager {
  private client: Client;
  private listenChannels: Set<string> = new Set();
  private ignoredChannels: Set<string> = new Set();

  constructor(client: Client) {
    this.client = client;
    this.initializeChannels();
  }

  private initializeChannels() {
    // Add configured listen channel
    if (config.listenChannelId) {
      this.listenChannels.add(config.listenChannelId);
    }

    // Add any additional channels from environment (comma-separated)
    const additionalChannels =
      process.env.ADDITIONAL_LISTEN_CHANNELS?.split(",");
    if (additionalChannels) {
      additionalChannels.forEach((channelId) => {
        this.listenChannels.add(channelId.trim());
      });
    }

    // Add ignored channels from environment (comma-separated)
    const ignoredChannels = process.env.IGNORED_CHANNELS?.split(",");
    if (ignoredChannels) {
      ignoredChannels.forEach((channelId) => {
        this.ignoredChannels.add(channelId.trim());
      });
    }
  }

  /**
   * Check if bot should listen to messages in this channel
   */
  shouldListenToChannel(channelId: string): boolean {
    // If ignored, don't listen
    if (this.ignoredChannels.has(channelId)) {
      return false;
    }

    // If no specific channels configured, listen to all (except ignored)
    if (this.listenChannels.size === 0) {
      return true;
    }

    // Only listen to configured channels
    return this.listenChannels.has(channelId);
  }

  /**
   * Get channel information for logging
   */
  getChannelInfo(channel: Channel): {
    name: string;
    type: string;
    isListening: boolean;
  } {
    const channelName =
      channel.type === ChannelType.DM
        ? "DM"
        : "name" in channel
        ? channel.name || "Unnamed"
        : "Unknown";

    const channelType = ChannelType[channel.type] || "Unknown";
    const isListening = this.shouldListenToChannel(channel.id);

    return {
      name: channelName,
      type: channelType,
      isListening,
    };
  }

  /**
   * Add a channel to listen list
   */
  addListenChannel(channelId: string): boolean {
    const channel = this.client.channels.cache.get(channelId);
    if (!channel) {
      Logger.warn(`Cannot add channel ${channelId} - not found`);
      return false;
    }

    this.listenChannels.add(channelId);
    const channelInfo = this.getChannelInfo(channel);
    Logger.success(`✅ Added channel to listen list: #${channelInfo.name}`);
    return true;
  }

  /**
   * Remove a channel from listen list
   */
  removeListenChannel(channelId: string): boolean {
    if (!this.listenChannels.has(channelId)) {
      Logger.warn(`Channel ${channelId} not in listen list`);
      return false;
    }

    this.listenChannels.delete(channelId);
    const channel = this.client.channels.cache.get(channelId);
    const channelName = channel && "name" in channel ? channel.name : channelId;
    Logger.success(`✅ Removed channel from listen list: #${channelName}`);
    return true;
  }

  /**
   * Get all configured listen channels
   */
  getListenChannels(): string[] {
    return Array.from(this.listenChannels);
  }

  /**
   * Add a channel to ignore list
   */
  addIgnoredChannel(channelId: string): boolean {
    const channel = this.client.channels.cache.get(channelId);
    if (!channel) {
      Logger.warn(`Cannot ignore channel ${channelId} - not found`);
      return false;
    }

    this.ignoredChannels.add(channelId);
    const channelInfo = this.getChannelInfo(channel);
    Logger.success(`🚫 Added channel to ignore list: #${channelInfo.name}`);
    return true;
  }

  /**
   * Remove a channel from ignore list
   */
  removeIgnoredChannel(channelId: string): boolean {
    if (!this.ignoredChannels.has(channelId)) {
      Logger.warn(`Channel ${channelId} not in ignore list`);
      return false;
    }

    this.ignoredChannels.delete(channelId);
    const channel = this.client.channels.cache.get(channelId);
    const channelName = channel && "name" in channel ? channel.name : channelId;
    Logger.success(`✅ Removed channel from ignore list: #${channelName}`);
    return true;
  }

  /**
   * Get all ignored channels
   */
  getIgnoredChannels(): string[] {
    return Array.from(this.ignoredChannels);
  }

  /**
   * Get channel statistics
   */
  getChannelStats() {
    return {
      listenChannels: this.listenChannels.size,
      ignoredChannels: this.ignoredChannels.size,
      totalChannels: this.client.channels.cache.size,
    };
  }

  /**
   * Log current channel configuration
   */
  logConfiguration() {
    Logger.info("📋 Channel Configuration:");

    if (this.listenChannels.size > 0) {
      Logger.info(
        `🎯 Listening to ${this.listenChannels.size} specific channel(s):`
      );
      this.listenChannels.forEach((channelId) => {
        const channel = this.client.channels.cache.get(channelId);
        const channelName =
          channel && "name" in channel ? channel.name : channelId;
        Logger.info(`   - #${channelName} (${channelId})`);
      });
    } else {
      Logger.info(
        "🌐 Listening to ALL channels (no specific channels configured)"
      );
    }

    if (this.ignoredChannels.size > 0) {
      Logger.info(`🚫 Ignoring ${this.ignoredChannels.size} channel(s):`);
      this.ignoredChannels.forEach((channelId) => {
        const channel = this.client.channels.cache.get(channelId);
        const channelName =
          channel && "name" in channel ? channel.name : channelId;
        Logger.info(`   - #${channelName} (${channelId})`);
      });
    }
  }
}
