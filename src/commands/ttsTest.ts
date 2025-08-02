import { Message } from 'discord.js';
import { Logger } from '../utils/logger.js';

export const ttsTestCommand = {
    name: 'tts-test',
    description: 'Kiểm tra tích hợp TTS (Text-to-Speech)',
    async execute(message: Message) {
        try {
            Logger.info(`🧪 TTS test command executed by ${message.author.tag}`);

            // Check if managers are available
            const ttsManager = (message.client as any).ttsManager;
            const voiceManager = (message.client as any).voiceManager;

            if (!ttsManager) {
                await message.reply('❌ Không tìm thấy TTS Manager. Vui lòng kiểm tra cấu hình bot.');
                return;
            }

            if (!voiceManager) {
                await message.reply('❌ Không tìm thấy Voice Manager. Vui lòng kiểm tra cấu hình bot.');
                return;
            }

            if (!message.guild) {
                await message.reply('❌ Lệnh này chỉ có thể được sử dụng trong server.');
                return;
            }

            // Check TTS manager status
            if (!ttsManager.isReady()) {
                await message.reply('❌ TTS Manager chưa được khởi tạo. Vui lòng đợi bot khởi động hoàn tất.');
                return;
            }

            await message.reply('🧪 Bắt đầu kiểm tra tích hợp TTS...');

            // Test 1: TTS Service Info
            const ttsStats = ttsManager.getStats();
            Logger.info('📊 TTS Stats:', ttsStats);

            // Test 2: Generate TTS for test message
            const testText = 'Xin chào! Đây là bài kiểm tra tích hợp text-to-speech. Nếu bạn có thể nghe thấy điều này, hệ thống TTS đang hoạt động chính xác.';
            
            Logger.info('🔊 Testing TTS generation...');
            const ttsResult = await ttsManager.textToSpeechForDiscord(testText);

            if (!ttsResult.success) {
                await message.reply(`❌ Tạo TTS thất bại: ${ttsResult.error}`);
                return;
            }

            if (!ttsResult.tempAudioPath) {
                await message.reply('❌ Tạo TTS thành công nhưng không có file âm thanh nào được tạo.');
                return;
            }

            await message.reply('✅ Tạo TTS thành công! Bây giờ đang kiểm tra phát âm thanh...');

            // Test 3: Voice Channel Playback
            Logger.info('🎵 Testing voice playback...');
            const playbackResult = await voiceManager.playAudioFile(
                message.guild.id,
                ttsResult.tempAudioPath
            );

            if (playbackResult.success) {
                await message.reply(`✅ Kiểm tra tích hợp TTS hoàn thành thành công! 
🎵 Âm thanh đã phát trong ${playbackResult.duration}ms
🔊 Dịch vụ TTS: Giọng ${ttsStats.ttsService.voice} với tốc độ ${ttsStats.ttsService.speed}
📁 Định dạng âm thanh: ${ttsStats.ttsService.format}
💾 File âm thanh đã lưu: ${ttsStats.audioFiles.totalFiles}`);
                
                Logger.success('✅ TTS integration test passed completely');
            } else {
                await message.reply(`⚠️ Tạo TTS thành công, nhưng phát âm thanh thất bại: ${playbackResult.error}
Vui lòng kiểm tra:
- Bot có quyền tham gia kênh thoại
- Kênh thoại được cấu hình đúng: ${process.env.VOICE_CHANNEL_ID || 'Chưa thiết lập'}
- Bot đã kết nối với kênh thoại`);
                
                Logger.warn('⚠️ TTS integration test partially failed: voice playback issue');
            }

        } catch (error) {
            Logger.error('❌ TTS test command error:', error);
            await message.reply(`❌ Kiểm tra TTS thất bại với lỗi: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
        }
    }
};

export const aiTtsTestCommand = {
    name: 'ai-tts-test',
    description: 'Kiểm tra pipeline AI + TTS hoàn chỉnh',
    async execute(message: Message) {
        try {
            Logger.info(`🧪 AI+TTS test command executed by ${message.author.tag}`);

            // Check if managers are available
            const aiManager = (message.client as any).aiManager;
            const ttsManager = (message.client as any).ttsManager;
            const voiceManager = (message.client as any).voiceManager;

            if (!aiManager || !ttsManager || !voiceManager) {
                await message.reply('❌ Không tìm thấy các manager cần thiết. Vui lòng kiểm tra cấu hình bot.');
                return;
            }

            if (!message.guild) {
                await message.reply('❌ Lệnh này chỉ có thể được sử dụng trong server.');
                return;
            }

            await message.reply('🧪 Đang kiểm tra pipeline AI + TTS hoàn chỉnh...');

            // Test AI response generation
            Logger.info('🧠 Testing AI response generation...');
            const testResponse = await aiManager.testAI();

            if (!testResponse) {
                await message.reply('❌ Tạo phản hồi AI thất bại.');
                return;
            }

            await message.reply(`🧠 AI đã tạo phản hồi: "${testResponse.substring(0, 100)}${testResponse.length > 100 ? '...' : ''}"`);

            // Test TTS conversion
            Logger.info('🔊 Converting AI response to speech...');
            const ttsResult = await ttsManager.textToSpeechForDiscord(testResponse);

            if (!ttsResult.success || !ttsResult.tempAudioPath) {
                await message.reply(`❌ Chuyển đổi TTS thất bại: ${ttsResult.error}`);
                return;
            }

            // Test voice playback
            Logger.info('🎵 Playing AI response as speech...');
            const playbackResult = await voiceManager.playAudioFile(
                message.guild.id,
                ttsResult.tempAudioPath
            );

            if (playbackResult.success) {
                await message.reply(`✅ Kiểm tra pipeline AI + TTS hoàn chỉnh thành công! 
🧠 Phản hồi AI: Tạo thành công
🔊 Chuyển đổi TTS: Đã tạo ${ttsResult.tempAudioPath}
🎵 Phát âm thanh: Hoàn thành trong ${playbackResult.duration}ms

Bot đã sẵn sàng cung cấp phản hồi AI với text-to-speech!`);
                
                Logger.success('✅ Complete AI + TTS pipeline test passed');
            } else {
                await message.reply(`⚠️ AI và TTS hoạt động, nhưng phát âm thanh thất bại: ${playbackResult.error}`);
                Logger.warn('⚠️ AI + TTS pipeline test partially failed: voice playback issue');
            }

        } catch (error) {
            Logger.error('❌ AI+TTS test command error:', error);
            await message.reply(`❌ Kiểm tra AI+TTS thất bại với lỗi: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
        }
    }
};