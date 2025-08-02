import { Message } from 'discord.js';
import { Logger } from '../utils/logger.js';

export const ttsTestCommand = {
    name: 'tts-test',
    description: 'Test the TTS (Text-to-Speech) integration',
    async execute(message: Message) {
        try {
            Logger.info(`🧪 TTS test command executed by ${message.author.tag}`);

            // Check if managers are available
            const ttsManager = (message.client as any).ttsManager;
            const voiceManager = (message.client as any).voiceManager;

            if (!ttsManager) {
                await message.reply('❌ TTS Manager not found. Please check bot configuration.');
                return;
            }

            if (!voiceManager) {
                await message.reply('❌ Voice Manager not found. Please check bot configuration.');
                return;
            }

            if (!message.guild) {
                await message.reply('❌ This command can only be used in a server.');
                return;
            }

            // Check TTS manager status
            if (!ttsManager.isReady()) {
                await message.reply('❌ TTS Manager is not initialized. Please wait for bot startup to complete.');
                return;
            }

            await message.reply('🧪 Starting TTS integration test...');

            // Test 1: TTS Service Info
            const ttsStats = ttsManager.getStats();
            Logger.info('📊 TTS Stats:', ttsStats);

            // Test 2: Generate TTS for test message
            const testText = 'Hello! This is a test of the text-to-speech integration. If you can hear this, the TTS system is working correctly.';
            
            Logger.info('🔊 Testing TTS generation...');
            const ttsResult = await ttsManager.textToSpeechForDiscord(testText);

            if (!ttsResult.success) {
                await message.reply(`❌ TTS generation failed: ${ttsResult.error}`);
                return;
            }

            if (!ttsResult.tempAudioPath) {
                await message.reply('❌ TTS generation succeeded but no audio file was created.');
                return;
            }

            await message.reply('✅ TTS generation successful! Now testing voice playback...');

            // Test 3: Voice Channel Playback
            Logger.info('🎵 Testing voice playback...');
            const playbackResult = await voiceManager.playAudioFile(
                message.guild.id,
                ttsResult.tempAudioPath
            );

            if (playbackResult.success) {
                await message.reply(`✅ TTS integration test completed successfully! 
🎵 Audio played in ${playbackResult.duration}ms
🔊 TTS Service: ${ttsStats.ttsService.voice} voice at ${ttsStats.ttsService.speed} speed
📁 Audio format: ${ttsStats.ttsService.format}
💾 Audio files stored: ${ttsStats.audioFiles.totalFiles}`);
                
                Logger.success('✅ TTS integration test passed completely');
            } else {
                await message.reply(`⚠️ TTS generation worked, but voice playback failed: ${playbackResult.error}
Please check:
- Bot has permission to join voice channels
- Voice channel is configured correctly: ${process.env.VOICE_CHANNEL_ID || 'Not set'}
- Bot is connected to the voice channel`);
                
                Logger.warn('⚠️ TTS integration test partially failed: voice playback issue');
            }

        } catch (error) {
            Logger.error('❌ TTS test command error:', error);
            await message.reply(`❌ TTS test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
};

export const aiTtsTestCommand = {
    name: 'ai-tts-test',
    description: 'Test the complete AI + TTS pipeline',
    async execute(message: Message) {
        try {
            Logger.info(`🧪 AI+TTS test command executed by ${message.author.tag}`);

            // Check if managers are available
            const aiManager = (message.client as any).aiManager;
            const ttsManager = (message.client as any).ttsManager;
            const voiceManager = (message.client as any).voiceManager;

            if (!aiManager || !ttsManager || !voiceManager) {
                await message.reply('❌ Required managers not found. Please check bot configuration.');
                return;
            }

            if (!message.guild) {
                await message.reply('❌ This command can only be used in a server.');
                return;
            }

            await message.reply('🧪 Testing complete AI + TTS pipeline...');

            // Test AI response generation
            Logger.info('🧠 Testing AI response generation...');
            const testResponse = await aiManager.testAI();

            if (!testResponse) {
                await message.reply('❌ AI response generation failed.');
                return;
            }

            await message.reply(`🧠 AI generated response: "${testResponse.substring(0, 100)}${testResponse.length > 100 ? '...' : ''}"`);

            // Test TTS conversion
            Logger.info('🔊 Converting AI response to speech...');
            const ttsResult = await ttsManager.textToSpeechForDiscord(testResponse);

            if (!ttsResult.success || !ttsResult.tempAudioPath) {
                await message.reply(`❌ TTS conversion failed: ${ttsResult.error}`);
                return;
            }

            // Test voice playback
            Logger.info('🎵 Playing AI response as speech...');
            const playbackResult = await voiceManager.playAudioFile(
                message.guild.id,
                ttsResult.tempAudioPath
            );

            if (playbackResult.success) {
                await message.reply(`✅ Complete AI + TTS pipeline test successful! 
🧠 AI Response: Generated successfully
🔊 TTS Conversion: Generated ${ttsResult.tempAudioPath}
🎵 Voice Playback: Completed in ${playbackResult.duration}ms

The bot is ready to provide AI responses with text-to-speech!`);
                
                Logger.success('✅ Complete AI + TTS pipeline test passed');
            } else {
                await message.reply(`⚠️ AI and TTS worked, but voice playback failed: ${playbackResult.error}`);
                Logger.warn('⚠️ AI + TTS pipeline test partially failed: voice playback issue');
            }

        } catch (error) {
            Logger.error('❌ AI+TTS test command error:', error);
            await message.reply(`❌ AI+TTS test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
};