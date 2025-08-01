export const config = {
    // Discord Configuration
    token: process.env.DISCORD_TOKEN!,
    clientId: process.env.DISCORD_CLIENT_ID!,
    guildId: process.env.DISCORD_GUILD_ID!,
    
    // Channel Configuration
    listenChannelId: process.env.LISTEN_CHANNEL_ID!,
    voiceChannelId: process.env.VOICE_CHANNEL_ID!,
    
    // AI Configuration
    openaiApiKey: process.env.OPENAI_API_KEY!,
    
    // TTS Configuration
    viettelTtsToken: process.env.VIETTEL_TTS_TOKEN!,
    viettelTtsUrl: 'https://viettelai.vn/tts/speech_synthesis',
    
    // Database Configuration
    databasePath: process.env.DATABASE_PATH || './data/bot.db',
    
    // Bot Behavior
    ttsVoice: 'hn-quynhanh',
    ttsSpeed: '1.0',
    ttsReturnOption: 2, // 2 for wav, 3 for mp3
};