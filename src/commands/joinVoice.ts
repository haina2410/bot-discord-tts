import { Message, GuildMember } from "discord.js";
import { Logger } from "../utils/logger.js";
import { VoiceManager } from "../utils/voiceManager.js";

export const joinVoiceCommand = {
  name: "join",
  description: "Bot sẽ tham gia kênh voice mà bạn đang ở",
  usage: "!join",
  aliases: ["voice", "thamgia"],
  async execute(message: Message) {
    try {
      Logger.info(`🔊 Join voice command executed by ${message.author.tag}`);

      // Check if command is used in a guild
      if (!message.guild) {
        await message.reply(
          "❌ Lệnh này chỉ có thể được sử dụng trong server."
        );
        return;
      }

      // Check if user is a guild member
      if (!(message.member instanceof GuildMember)) {
        await message.reply("❌ Không thể xác định thông tin thành viên.");
        return;
      }

      // Get voice manager from client
      const voiceManager = (message.client as any).voiceManager as VoiceManager;
      if (!voiceManager) {
        await message.reply(
          "❌ Không tìm thấy Voice Manager. Vui lòng kiểm tra cấu hình bot."
        );
        return;
      }

      // Check if user is in a voice channel
      const userVoiceChannel = voiceManager.getUserVoiceChannel(message.member);
      if (!userVoiceChannel) {
        await message.reply(
          "❌ Bạn cần phải ở trong một kênh voice để sử dụng lệnh này!\n💡 Hãy tham gia một kênh voice trước, sau đó thử lại."
        );
        return;
      }

      // Check if bot is already in the same channel
      if (voiceManager.isUserInSameChannel(message.member, message.guild.id)) {
        await message.reply(
          `✅ Bot đã ở trong kênh voice **${userVoiceChannel.name}** rồi!`
        );
        return;
      }

      // Send joining message
      const joiningMessage = await message.reply(
        `🔊 Đang tham gia kênh voice **${userVoiceChannel.name}**...`
      );

      // Try to join the voice channel
      const connection = await voiceManager.joinVoiceChannel(
        message.guild.id,
        userVoiceChannel.id
      );

      if (connection) {
        await joiningMessage.edit(
          `✅ Đã tham gia kênh voice **${userVoiceChannel.name}** thành công!\n🎵 Bot đã sẵn sàng để phát âm thanh TTS.`
        );
        Logger.success(
          `✅ Successfully joined voice channel: ${userVoiceChannel.name} (${userVoiceChannel.id})`
        );
      } else {
        await joiningMessage.edit(
          `❌ Không thể tham gia kênh voice **${userVoiceChannel.name}**.\n💡 Vui lòng kiểm tra quyền của bot hoặc thử lại sau.`
        );
        Logger.error(
          `❌ Failed to join voice channel: ${userVoiceChannel.name} (${userVoiceChannel.id})`
        );
      }
    } catch (error) {
      Logger.error("❌ Error in join voice command:", error);

      // Provide user-friendly error messages based on error type
      let errorMessage = "❌ Đã xảy ra lỗi khi tham gia kênh voice.";

      if (error instanceof Error) {
        if (error.message.includes("Missing Permissions")) {
          errorMessage =
            '❌ Bot không có quyền tham gia kênh voice này.\n💡 Vui lòng kiểm tra quyền "Connect" và "Speak" cho bot.';
        } else if (error.message.includes("Channel not found")) {
          errorMessage =
            "❌ Không tìm thấy kênh voice.\n💡 Vui lòng thử lại hoặc tham gia kênh voice khác.";
        } else if (
          error.message.includes("Connection timeout") ||
          error.message.includes("AbortError")
        ) {
          errorMessage =
            "❌ Kết nối tới kênh voice bị timeout.\n💡 Vui lòng thử lại sau. Có thể do mạng chậm hoặc server Discord đang bận.";
        } else if (error.message.includes("please try again")) {
          errorMessage =
            "❌ Kết nối tới kênh voice thất bại.\n💡 Vui lòng thử lại sau ít phút.";
        }
      }

      await message.reply(errorMessage);
    }
  },
};

export const leaveVoiceCommand = {
  name: "leave",
  description: "Bot sẽ rời khỏi kênh voice hiện tại",
  usage: "!leave",
  aliases: ["disconnect", "roi"],
  async execute(message: Message) {
    try {
      Logger.info(`🔊 Leave voice command executed by ${message.author.tag}`);

      // Check if command is used in a guild
      if (!message.guild) {
        await message.reply(
          "❌ Lệnh này chỉ có thể được sử dụng trong server."
        );
        return;
      }

      // Get voice manager from client
      const voiceManager = (message.client as any).voiceManager as VoiceManager;
      if (!voiceManager) {
        await message.reply(
          "❌ Không tìm thấy Voice Manager. Vui lòng kiểm tra cấu hình bot."
        );
        return;
      }

      // Check if bot is connected to any voice channel
      if (!voiceManager.isConnected(message.guild.id)) {
        await message.reply("❌ Bot hiện không ở trong kênh voice nào.");
        return;
      }

      // Try to leave the voice channel
      const success = await voiceManager.leaveVoiceChannel(message.guild.id);

      if (success) {
        await message.reply("✅ Đã rời khỏi kênh voice thành công!");
        Logger.success("✅ Successfully left voice channel");
      } else {
        await message.reply(
          "❌ Không thể rời khỏi kênh voice. Vui lòng thử lại."
        );
        Logger.error("❌ Failed to leave voice channel");
      }
    } catch (error) {
      Logger.error("❌ Error in leave voice command:", error);
      await message.reply("❌ Đã xảy ra lỗi khi rời khỏi kênh voice.");
    }
  },
};
