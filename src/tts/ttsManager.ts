import { TTSService } from './ttsService.js';
import type { TTSRequest, TTSResponse } from './ttsService.js';
import { AudioManager } from './audioManager.js';
import type { AudioFile } from './audioManager.js';
import { Logger } from '../utils/logger.js';

export interface TTSResult {
    success: boolean;
    audioFile?: AudioFile;
    tempAudioPath?: string;
    error?: string;
    text: string;
}

export class TTSManager {
    private ttsService: TTSService;
    private audioManager: AudioManager;
    private isInitialized = false;

    constructor(audioDirectory?: string) {
        this.ttsService = new TTSService();
        this.audioManager = new AudioManager(audioDirectory);
    }

    /**
     * Initialize the TTS manager
     */
    async initialize(): Promise<boolean> {
        try {
            Logger.info('🔊 Initializing TTS Manager...');

            // Validate TTS configuration
            const configValidation = this.ttsService.validateConfiguration();
            if (!configValidation.valid) {
                Logger.error('❌ TTS configuration invalid:', configValidation.errors);
                return false;
            }

            // Initialize audio manager
            await this.audioManager.initialize();

            // Test TTS service connection
            const connectionTest = await this.ttsService.testConnection();
            if (!connectionTest) {
                Logger.error('❌ TTS service connection test failed');
                return false;
            }

            // Clean up any existing temporary files
            await this.audioManager.cleanupTempFiles();

            this.isInitialized = true;
            Logger.success('✅ TTS Manager initialized successfully');
            return true;

        } catch (error) {
            Logger.error('❌ TTS Manager initialization failed:', error);
            return false;
        }
    }

    /**
     * Convert text to speech and return audio file
     */
    async textToSpeech(
        text: string, 
        options?: {
            voice?: string;
            speed?: string;
            returnOption?: number;
            saveToFile?: boolean; // If false, creates temporary file
        }
    ): Promise<TTSResult> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: 'TTS Manager not initialized',
                text
            };
        }

        try {
            Logger.info(`🗣️ Converting text to speech: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);

            // Generate speech using TTS service
            const ttsResponse: TTSResponse = await this.ttsService.synthesizeSpeech(text, options);

            if (!ttsResponse.success || !ttsResponse.audioData) {
                return {
                    success: false,
                    error: ttsResponse.error || 'TTS synthesis failed',
                    text
                };
            }

            // Handle audio data based on options
            const saveToFile = options?.saveToFile !== false; // Default to true

            if (saveToFile) {
                // Save as permanent audio file
                const audioFile = await this.audioManager.saveAudioFile(
                    ttsResponse.audioData,
                    ttsResponse.format,
                    text
                );

                return {
                    success: true,
                    audioFile,
                    text
                };
            } else {
                // Create temporary file for immediate use
                const tempPath = await this.audioManager.createTempAudioFile(
                    ttsResponse.audioData,
                    ttsResponse.format
                );

                return {
                    success: true,
                    tempAudioPath: tempPath,
                    text
                };
            }

        } catch (error) {
            Logger.error('❌ Text-to-speech conversion failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                text
            };
        }
    }

    /**
     * Convert text to speech for immediate Discord playback (temporary file)
     */
    async textToSpeechForDiscord(text: string, options?: Partial<TTSRequest>): Promise<TTSResult> {
        return this.textToSpeech(text, {
            ...options,
            saveToFile: false // Create temporary file for Discord playback
        });
    }

    /**
     * Get audio file by ID
     */
    async getAudioFile(id: string): Promise<{ file: AudioFile; data: Buffer } | null> {
        try {
            const audioFile = this.audioManager.getAudioFile(id);
            if (!audioFile) return null;

            const data = await this.audioManager.getAudioData(id);
            if (!data) return null;

            return { file: audioFile, data };
        } catch (error) {
            Logger.error(`❌ Failed to get audio file ${id}:`, error);
            return null;
        }
    }

    /**
     * Delete audio file
     */
    async deleteAudioFile(id: string): Promise<boolean> {
        return this.audioManager.deleteAudioFile(id);
    }

    /**
     * Clean up old audio files
     */
    async cleanup(olderThanHours: number = 24): Promise<void> {
        try {
            const deletedFiles = await this.audioManager.cleanupOldFiles(olderThanHours);
            const deletedTemp = await this.audioManager.cleanupTempFiles();
            
            if (deletedFiles > 0 || deletedTemp > 0) {
                Logger.info(`🧹 TTS cleanup completed: ${deletedFiles} old files, ${deletedTemp} temp files`);
            }
        } catch (error) {
            Logger.error('❌ TTS cleanup failed:', error);
        }
    }

    /**
     * Get TTS manager statistics
     */
    getStats() {
        const ttsInfo = this.ttsService.getServiceInfo();
        const audioStats = this.audioManager.getStats();

        return {
            initialized: this.isInitialized,
            ttsService: ttsInfo,
            audioFiles: audioStats
        };
    }

    /**
     * Test the complete TTS pipeline
     */
    async testTTSPipeline(): Promise<boolean> {
        try {
            Logger.info('🧪 Testing complete TTS pipeline...');

            const testText = 'Hello, this is a test of the text-to-speech pipeline.';
            const result = await this.textToSpeech(testText, { saveToFile: false });

            if (result.success && result.tempAudioPath) {
                Logger.success('✅ TTS pipeline test successful');
                
                // Clean up test file
                await this.audioManager.cleanupTempFiles();
                return true;
            } else {
                Logger.error('❌ TTS pipeline test failed:', result.error);
                return false;
            }
        } catch (error) {
            Logger.error('❌ TTS pipeline test error:', error);
            return false;
        }
    }

    /**
     * Get all audio files
     */
    getAllAudioFiles(): AudioFile[] {
        return this.audioManager.getAllAudioFiles();
    }

    /**
     * Check if TTS manager is ready
     */
    isReady(): boolean {
        return this.isInitialized;
    }
}