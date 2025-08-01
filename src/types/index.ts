export interface UserData {
    discordId: string;
    username: string;
    displayName?: string;
    joinedAt: Date;
    lastSeen: Date;
    messageCount: number;
    preferences: Record<string, any>;
    context: string; // AI context about the user
    personality?: string;
    interests?: string[];
}

export interface TTSRequest {
    speed: string;
    text: string;
    token: string;
    tts_return_option: number;
    voice: string;
    without_filter: boolean;
}

export interface TTSResponse {
    success: boolean;
    audioUrl?: string;
    audioBuffer?: Buffer;
    error?: string;
}