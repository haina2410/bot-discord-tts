import { Message } from 'discord.js';
import { Logger } from '../utils/logger.js';
import { MessageProcessor, type ListeningMode } from '../utils/messageProcessor.js';

let messageProcessor: MessageProcessor;

export function setMessageProcessor(processor: MessageProcessor) {
    messageProcessor = processor;
}

export const command = {
    name: 'listening',
    aliases: ['listen', 'mode'],
    description: 'Quản lý chế độ lắng nghe của bot trong kênh này',
    usage: '!listening [mode] [threshold]',
    examples: [
        '!listening - Xem chế độ hiện tại',
        '!listening mentions-only - Chỉ phản hồi khi được tag',
        '!listening smart-listening 0.7 - Lắng nghe thông minh với ngưỡng 70%',
        '!listening always-listen - Luôn lắng nghe và phản hồi',
        '!listening disabled - Tắt hoàn toàn'
    ],
    
    async execute(message: Message, args: string[]): Promise<boolean> {
        try {
            if (!messageProcessor) {
                await message.reply('❌ Message processor chưa được khởi tạo!');
                return true;
            }

            const channelId = message.channel.id;
            const currentMode = messageProcessor.getChannelListeningMode(channelId);

            // If no arguments, show current mode
            if (args.length === 0) {
                const modeDescriptions = {
                    'mentions-only': 'Chỉ phản hồi khi được tag (@bot)',
                    'smart-listening': 'Lắng nghe thông minh dựa trên độ liên quan',
                    'always-listen': 'Luôn lắng nghe và phản hồi mọi tin nhắn',
                    'disabled': 'Tắt hoàn toàn (chỉ lệnh hoạt động)'
                };

                const embed = {
                    color: 0x00AE86,
                    title: '🎧 Chế độ lắng nghe hiện tại',
                    fields: [
                        {
                            name: 'Chế độ',
                            value: `**${currentMode.mode}**\n${modeDescriptions[currentMode.mode]}`,
                            inline: false
                        }
                    ]
                };

                if (currentMode.threshold !== undefined) {
                    embed.fields.push({
                        name: 'Ngưỡng độ liên quan',
                        value: `${Math.round(currentMode.threshold * 100)}%`,
                        inline: true
                    });
                }

                embed.fields.push({
                    name: 'Các chế độ có sẵn',
                    value: Object.entries(modeDescriptions)
                        .map(([mode, desc]) => `**${mode}**: ${desc}`)
                        .join('\n'),
                    inline: false
                });

                await message.reply({ embeds: [embed] });
                return true;
            }

            const mode = args[0]?.toLowerCase();
            const validModes = ['mentions-only', 'smart-listening', 'always-listen', 'disabled'];

            if (!mode || !validModes.includes(mode)) {
                await message.reply(`❌ Chế độ không hợp lệ! Các chế độ có sẵn: ${validModes.join(', ')}`);
                return true;
            }

            const newMode: ListeningMode = { mode: mode as any };

            // Handle threshold for smart-listening mode
            if (mode === 'smart-listening') {
                if (args.length > 1 && args[1]) {
                    const threshold = parseFloat(args[1]);
                    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
                        await message.reply('❌ Ngưỡng phải là số từ 0.0 đến 1.0 (ví dụ: 0.7 cho 70%)');
                        return true;
                    }
                    newMode.threshold = threshold;
                } else {
                    newMode.threshold = 0.6; // Default threshold
                }
            }

            // Set the new mode
            messageProcessor.setChannelListeningMode(channelId, newMode);

            const modeNames: Record<string, string> = {
                'mentions-only': 'Chỉ phản hồi khi được tag',
                'smart-listening': 'Lắng nghe thông minh',
                'always-listen': 'Luôn lắng nghe',
                'disabled': 'Tắt hoàn toàn'
            };

            let response = `✅ Đã đặt chế độ lắng nghe thành **${modeNames[mode]}**`;
            
            if (newMode.threshold !== undefined) {
                response += ` với ngưỡng **${Math.round(newMode.threshold * 100)}%**`;
            }

            response += '\n\n';

            // Add explanation based on mode
            switch (mode) {
                case 'mentions-only':
                    response += '🏷️ Bot sẽ chỉ phản hồi khi được tag trực tiếp hoặc reply.';
                    break;
                case 'smart-listening':
                    response += `🧠 Bot sẽ phân tích độ liên quan của tin nhắn và phản hồi khi > ${Math.round((newMode.threshold || 0.6) * 100)}%.`;
                    break;
                case 'always-listen':
                    response += '👂 Bot sẽ phản hồi mọi tin nhắn trong kênh này (trừ lệnh).';
                    break;
                case 'disabled':
                    response += '🔇 Bot sẽ không phản hồi tin nhắn nào (chỉ lệnh hoạt động).';
                    break;
            }

            await message.reply(response);
            
            Logger.info(`🔧 ${message.author.tag} changed listening mode for channel ${message.channel} to ${mode}${newMode.threshold ? ` (threshold: ${newMode.threshold})` : ''}`);
            
            return true;

        } catch (error) {
            Logger.error('❌ Error in listening command:', error);
            await message.reply('❌ Có lỗi xảy ra khi thay đổi chế độ lắng nghe!');
            return true;
        }
    }
};

export default command;