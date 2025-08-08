export const config = {
  // Discord Configuration
  token: process.env.DISCORD_TOKEN!,
  guildId: process.env.DISCORD_GUILD_ID!,

  // Channel Configuration
  listenChannelId: process.env.LISTEN_CHANNEL_ID!,
  voiceChannelId: process.env.VOICE_CHANNEL_ID!,

  // AI Configuration
  openaiApiKey: process.env.OPENAI_API_KEY!,

  // TTS Configuration
  viettelTtsToken: process.env.VIETTEL_TTS_TOKEN!,
  viettelTtsUrl: "https://viettelai.vn/tts/speech_synthesis",

  // Database Configuration
  databaseUrl: process.env.DATABASE_URL!,

  // Bot Behavior
  ttsVoice: "hn-thanhtung",
  ttsSpeed: "1.0",
  ttsReturnOption: 2, // 2 for wav, 3 for mp3
};
