import { promises as fs } from 'fs';
import { join } from 'path';
import { Logger } from '../utils/logger.js';

export interface AudioFile {
    id: string;
    filename: string;
    path: string;
    format: 'wav' | 'mp3';
    size: number;
    createdAt: Date;
    text: string; // Original text that was synthesized
}

export class AudioManager {
    private readonly audioDirectory: string;
    private audioFiles = new Map<string, AudioFile>();

    constructor(audioDirectory: string = './data/audio') {
        this.audioDirectory = audioDirectory;
    }

    /**
     * Initialize the audio manager and create directories
     */
    async initialize(): Promise<void> {
        try {
            await fs.mkdir(this.audioDirectory, { recursive: true });
            Logger.info(`🎵 Audio directory initialized: ${this.audioDirectory}`);
        } catch (error) {
            Logger.error('❌ Failed to initialize audio directory:', error);
            throw error;
        }
    }

    /**
     * Save audio data to file and return audio file info
     */
    async saveAudioFile(
        audioData: Buffer, 
        format: 'wav' | 'mp3', 
        originalText: string
    ): Promise<AudioFile> {
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const id = `tts_${timestamp}`;
            const filename = `${id}.${format}`;
            const filePath = join(this.audioDirectory, filename);

            // Save the audio data
            await fs.writeFile(filePath, audioData);

            // Create audio file info
            const audioFile: AudioFile = {
                id,
                filename,
                path: filePath,
                format,
                size: audioData.length,
                createdAt: new Date(),
                text: originalText
            };

            // Store in memory cache
            this.audioFiles.set(id, audioFile);

            Logger.success(`✅ Audio file saved: ${filename} (${audioData.length} bytes)`);
            return audioFile;

        } catch (error) {
            Logger.error('❌ Failed to save audio file:', error);
            throw error;
        }
    }

    /**
     * Get audio file by ID
     */
    getAudioFile(id: string): AudioFile | undefined {
        return this.audioFiles.get(id);
    }

    /**
     * Get audio file data as buffer
     */
    async getAudioData(id: string): Promise<Buffer | null> {
        try {
            const audioFile = this.audioFiles.get(id);
            if (!audioFile) {
                Logger.warn(`⚠️ Audio file not found: ${id}`);
                return null;
            }

            const data = await fs.readFile(audioFile.path);
            return data;
        } catch (error) {
            Logger.error(`❌ Failed to read audio file ${id}:`, error);
            return null;
        }
    }

    /**
     * Check if audio file exists
     */
    async audioFileExists(id: string): Promise<boolean> {
        try {
            const audioFile = this.audioFiles.get(id);
            if (!audioFile) return false;

            await fs.access(audioFile.path);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Delete audio file
     */
    async deleteAudioFile(id: string): Promise<boolean> {
        try {
            const audioFile = this.audioFiles.get(id);
            if (!audioFile) {
                Logger.warn(`⚠️ Audio file not found for deletion: ${id}`);
                return false;
            }

            await fs.unlink(audioFile.path);
            this.audioFiles.delete(id);

            Logger.info(`🗑️ Audio file deleted: ${audioFile.filename}`);
            return true;
        } catch (error) {
            Logger.error(`❌ Failed to delete audio file ${id}:`, error);
            return false;
        }
    }

    /**
     * Clean up old audio files (older than specified hours)
     */
    async cleanupOldFiles(olderThanHours: number = 24): Promise<number> {
        try {
            const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
            let deletedCount = 0;

            for (const [id, audioFile] of this.audioFiles.entries()) {
                if (audioFile.createdAt.getTime() < cutoffTime) {
                    const deleted = await this.deleteAudioFile(id);
                    if (deleted) deletedCount++;
                }
            }

            if (deletedCount > 0) {
                Logger.info(`🧹 Cleaned up ${deletedCount} old audio files`);
            }

            return deletedCount;
        } catch (error) {
            Logger.error('❌ Failed to cleanup old audio files:', error);
            return 0;
        }
    }

    /**
     * Get all audio files info
     */
    getAllAudioFiles(): AudioFile[] {
        return Array.from(this.audioFiles.values());
    }

    /**
     * Get audio manager statistics
     */
    getStats() {
        const files = Array.from(this.audioFiles.values());
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const formatCounts = files.reduce((counts, file) => {
            counts[file.format] = (counts[file.format] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);

        return {
            totalFiles: files.length,
            totalSizeBytes: totalSize,
            totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
            formatCounts,
            directory: this.audioDirectory
        };
    }

    /**
     * Create a temporary audio file for immediate use
     */
    async createTempAudioFile(audioData: Buffer, format: 'wav' | 'mp3'): Promise<string> {
        try {
            const tempFilename = `temp_${Date.now()}.${format}`;
            const tempPath = join(this.audioDirectory, tempFilename);
            
            await fs.writeFile(tempPath, audioData);
            
            Logger.info(`📁 Created temporary audio file: ${tempFilename}`);
            return tempPath;
        } catch (error) {
            Logger.error('❌ Failed to create temporary audio file:', error);
            throw error;
        }
    }

    /**
     * Delete temporary files (files starting with 'temp_')
     */
    async cleanupTempFiles(): Promise<number> {
        try {
            const files = await fs.readdir(this.audioDirectory);
            const tempFiles = files.filter(file => file.startsWith('temp_'));
            let deletedCount = 0;

            for (const tempFile of tempFiles) {
                try {
                    await fs.unlink(join(this.audioDirectory, tempFile));
                    deletedCount++;
                } catch (error) {
                    Logger.warn(`⚠️ Failed to delete temp file ${tempFile}:`, error);
                }
            }

            if (deletedCount > 0) {
                Logger.info(`🧹 Cleaned up ${deletedCount} temporary audio files`);
            }

            return deletedCount;
        } catch (error) {
            Logger.error('❌ Failed to cleanup temporary files:', error);
            return 0;
        }
    }
}