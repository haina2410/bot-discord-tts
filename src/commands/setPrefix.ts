import { Message } from 'discord.js';
import { MessageProcessor } from '../utils/messageProcessor.js';
import { DatabaseManager } from '../database/databaseManager.js';
import { DatabaseCRUD } from '../database/operations.js';

const command = {
  name: 'setprefix',
  description: 'Đặt tiền tố lệnh mới cho server',
  usage: '!setprefix <prefix>',
  aliases: ['prefix'],
  async execute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) {
      await message.reply('❌ Lệnh này chỉ sử dụng trong server.');
      return;
    }

    const prefix = args[0];
    if (!prefix) {
      await message.reply(`❌ Cách sử dụng: ${command.usage}`);
      return;
    }

    const messageProcessor = (message.client as any).messageProcessor as MessageProcessor;
    messageProcessor.setCommandPrefix(message.guild.id, prefix);

    const databaseManager = (message.client as any).databaseManager as DatabaseManager;
    if (databaseManager?.isReady()) {
      const crud = new DatabaseCRUD(databaseManager.getDatabase());
      await crud.updateServerProfile(message.guild.id, { commandPrefix: prefix });
    }

    await message.reply(`✅ Đã đặt tiền tố lệnh thành \`${prefix}\`.`);
  }
};

export default command;
