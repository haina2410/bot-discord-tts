# Discord Bot Setup Guide

## Step 1: Create Discord Application

1. **Go to Discord Developer Portal**

   - Visit: https://discord.com/developers/applications
   - Log in with your Discord account

2. **Create New Application**
   - Click "New Application"
   - Name: "AI Chatbot" (or your preferred name)
   - Click "Create"

## Step 2: Create Bot User

1. **Navigate to Bot Section**

   - In your application, click "Bot" in the left sidebar
   - Click "Add Bot" → "Yes, do it!"

2. **Configure Bot Settings**

   - **Username**: Set your bot's username
   - **Icon**: Upload a bot avatar (optional)
   - **Public Bot**: Disable if you want it private to your server
   - **Require OAuth2 Code Grant**: Keep disabled

3. **Bot Permissions & Intents**
   - Scroll down to "Privileged Gateway Intents"
   - Enable: "Message Content Intent" ✅
   - Enable: "Server Members Intent" ✅ (for user data collection)

## Step 3: Get Bot Token

1. **Copy Bot Token**
   - In the Bot section, click "Reset Token"
   - Copy the token (keep it secret!)
   - Add it to your `.env` file as `DISCORD_TOKEN`

## Step 4: Get Application IDs

1. **Get Client ID**
   - Go to "General Information" tab
   - Copy "Application ID"
   - Add it to your `.env` file as `DISCORD_CLIENT_ID`

## Step 5: Invite Bot to Server

1. **Generate Invite URL**

   - Go to "OAuth2" → "URL Generator"
   - **Scopes**: Check "bot" and "applications.commands"
   - **Bot Permissions**: Check:
     - Send Messages ✅
     - Read Message History ✅
     - Connect ✅ (for voice)
     - Speak ✅ (for voice)
     - Use Voice Activity ✅

2. **Invite Bot**
   - Copy the generated URL
   - Open it in browser
   - Select your server and authorize

## Step 6: Get Channel & Guild IDs

1. **Enable Developer Mode**

   - Discord Settings → Advanced → Developer Mode ✅

2. **Get Guild ID**

   - Right-click your server name → "Copy Server ID"
   - Add it to your `.env` file as `DISCORD_GUILD_ID`

3. **Get Channel ID**

   - Right-click the channel you want the bot to listen to
   - "Copy Channel ID"
   - Add it to your `.env` file as `LISTEN_CHANNEL_ID`

4. **Get Voice Channel ID** (optional)
   - Right-click a voice channel → "Copy Channel ID"
   - Add it to your `.env` file as `VOICE_CHANNEL_ID`

## Step 7: Configure Environment

Create/update your `.env` file:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here

# Target Channels
LISTEN_CHANNEL_ID=your_text_channel_id_here
VOICE_CHANNEL_ID=your_voice_channel_id_here

# AI Configuration (for later tasks)
OPENAI_API_KEY=your_openai_api_key_here

# TTS Configuration (for later tasks)
VIETTEL_TTS_TOKEN=your_viettel_tts_token_here
```

## Step 8: Test Connection

Run the bot:

```bash
bun run start
```

You should see:

- "Discord AI Chatbot is ready!"
- Bot appears online in your server
- Test with `!test` in your configured channel

## Troubleshooting

- **Bot not responding**: Check channel ID and permissions
- **Login failed**: Verify bot token
- **Missing permissions**: Re-invite bot with correct permissions
- **Intents error**: Enable Message Content Intent in Discord portal
