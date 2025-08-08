import { Message } from 'discord.js';
import { ChannelManager } from '../utils/channelManager.js';
import { DatabaseManager } from '../database/databaseManager.js';
import { DatabaseCRUD } from '../database/operations.js';

const command = {
  name: 'ignorechannel',
  aliases: ['ignore'],
  description: 'Quản lý danh sách kênh bị bỏ qua',
  usage: '!ignorechannel <#kênh>|remove <#kênh>|list',
  async execute(message: Message, args: string[]): Promise<void> {
    const channelManager = (message.client as any).channelManager as ChannelManager;
    const databaseManager = (message.client as any).databaseManager as DatabaseManager;

    if (!channelManager) {
      await message.reply('❌ Channel manager không khả dụng.');
      return;
    }

    if (args.length === 0) {
      await message.reply(`❌ Cách sử dụng: ${command.usage}`);
      return;
    }

    if (args[0] === 'list') {
      const ignored = channelManager.getIgnoredChannels();
      if (ignored.length === 0) {
        await message.reply('📃 Không có kênh nào bị bỏ qua.');
      } else {
        const list = ignored.map(id => `<#${id}>`).join(', ');
        await message.reply(`📃 Kênh đang bị bỏ qua: ${list}`);
      }
      return;
    }

    let remove = false;
    let channelArg = args[0];
    if (args[0] === 'remove') {
      remove = true;
      channelArg = args[1];
    }

    if (!channelArg) {
      await message.reply('❌ Vui lòng chỉ định kênh.');
      return;
    }

    const match = channelArg.match(/^<#(\d+)>$/);
    const channelId = match ? match[1]! : channelArg;

    let success = false;
    if (remove) {
      success = channelManager.removeIgnoredChannel(channelId);
    } else {
      success = channelManager.addIgnoredChannel(channelId);
    }

    if (!success) {
      await message.reply('❌ Không thể cập nhật danh sách kênh.');
      return;
    }

    if (databaseManager?.isReady() && message.guild) {
      const crud = new DatabaseCRUD(databaseManager.getDatabase());
      await crud.updateServerProfile(message.guild.id, {
        ignoringChannels: channelManager.getIgnoredChannels(),
      });
    }

    await message.reply(
      remove
        ? `✅ Đã bỏ qua kênh <#${channelId}> khỏi danh sách.`
        : `✅ Sẽ bỏ qua kênh <#${channelId}>.`
    );
  }
};

export default command;
