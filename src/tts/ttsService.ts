import axios, { AxiosResponse } from 'axios';
import { config } from '../../config/bot.js';
import { Logger } from '../utils/logger.js';

export interface TTSRequest {
    text: string;
    voice?: string;
    speed?: string;
    returnOption?: number;
}

export interface TTSResponse {
    success: boolean;
    audioData?: Buffer;
    audioUrl?: string;
    error?: string;
    format: 'wav' | 'mp3';
}

export class TTSService {
    private readonly apiUrl: string;
    private readonly token: string;
    private readonly defaultVoice: string;
    private readonly defaultSpeed: string;
    private readonly defaultReturnOption: number;

    constructor() {
        this.apiUrl = config.viettelTtsUrl;
        this.token = config.viettelTtsToken;
        this.defaultVoice = config.ttsVoice;
        this.defaultSpeed = config.ttsSpeed;
        this.defaultReturnOption = config.ttsReturnOption;
    }

    /**
     * Test the TTS service connection
     */
    async testConnection(): Promise<boolean> {
        try {
            Logger.info('🔊 Testing TTS service connection...');
            const testResponse = await this.synthesizeSpeech('Test connection');
            
            if (testResponse.success) {
                Logger.success('✅ TTS service connection successful');
                return true;
            } else {
                Logger.error('❌ TTS service connection failed:', testResponse.error);
                return false;
            }
        } catch (error) {
            Logger.error('❌ TTS service connection test error:', error);
            return false;
        }
    }

    /**
     * Synthesize speech from text using Viettel TTS API
     */
    async synthesizeSpeech(text: string, options?: Partial<TTSRequest>): Promise<TTSResponse> {
        try {
            // Validate input
            if (!text || text.trim().length === 0) {
                return {
                    success: false,
                    error: 'Text input is required and cannot be empty',
                    format: this.defaultReturnOption === 2 ? 'wav' : 'mp3'
                };
            }

            // Prepare request payload
            const payload = {
                text: text.trim(),
                voice: options?.voice || this.defaultVoice,
                speed: options?.speed || this.defaultSpeed,
                return_option: options?.returnOption || this.defaultReturnOption
            };

            // Prepare headers
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            };

            Logger.info(`🔊 Synthesizing speech for text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
            Logger.info(`   Voice: ${payload.voice}, Speed: ${payload.speed}, Format: ${payload.return_option === 2 ? 'WAV' : 'MP3'}`);

            // Make the POST request
            const response: AxiosResponse = await axios.post(this.apiUrl, payload, {
                headers,
                timeout: 30000, // 30 second timeout
                responseType: 'arraybuffer' // Important for binary audio data
            });

            // Check response status
            if (response.status === 200) {
                const audioData = Buffer.from(response.data);
                const format = payload.return_option === 2 ? 'wav' : 'mp3';

                Logger.success(`✅ TTS synthesis successful - Generated ${audioData.length} bytes of ${format.toUpperCase()} audio`);

                return {
                    success: true,
                    audioData,
                    format
                };
            } else {
                const errorMessage = `TTS API returned status ${response.status}`;
                Logger.error('❌ TTS synthesis failed:', errorMessage);
                
                return {
                    success: false,
                    error: errorMessage,
                    format: payload.return_option === 2 ? 'wav' : 'mp3'
                };
            }

        } catch (error: any) {
            let errorMessage = 'Unknown error occurred';
            
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    // Server responded with error status
                    errorMessage = `TTS API error: ${error.response.status} - ${error.response.statusText}`;
                    if (error.response.data) {
                        try {
                            const errorData = typeof error.response.data === 'string' 
                                ? error.response.data 
                                : JSON.stringify(error.response.data);
                            errorMessage += ` - ${errorData}`;
                        } catch (e) {
                            // Ignore JSON parsing errors
                        }
                    }
                } else if (error.request) {
                    // Request was made but no response received
                    errorMessage = 'TTS API request timeout or network error';
                } else {
                    // Something else happened
                    errorMessage = `TTS request setup error: ${error.message}`;
                }
            } else {
                errorMessage = error.message || error.toString();
            }

            Logger.error('❌ TTS synthesis error:', errorMessage);

            return {
                success: false,
                error: errorMessage,
                format: this.defaultReturnOption === 2 ? 'wav' : 'mp3'
            };
        }
    }

    /**
     * Get TTS service configuration info
     */
    getServiceInfo() {
        return {
            apiUrl: this.apiUrl,
            voice: this.defaultVoice,
            speed: this.defaultSpeed,
            format: this.defaultReturnOption === 2 ? 'WAV' : 'MP3',
            returnOption: this.defaultReturnOption
        };
    }

    /**
     * Validate TTS configuration
     */
    validateConfiguration(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.apiUrl) {
            errors.push('TTS API URL is not configured');
        }

        if (!this.token) {
            errors.push('TTS API token is not configured');
        }

        if (!this.defaultVoice) {
            errors.push('TTS voice is not configured');
        }

        if (!this.defaultSpeed) {
            errors.push('TTS speed is not configured');
        }

        if (this.defaultReturnOption !== 2 && this.defaultReturnOption !== 3) {
            errors.push('TTS return option must be 2 (WAV) or 3 (MP3)');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}