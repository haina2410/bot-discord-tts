import { Client, GatewayIntentBits, Collection } from 'discord.js';
import 'dotenv/config';
import { config } from '../config/bot.js';
import { loadEvents } from './utils/eventLoader.js';
import { ChannelManager } from './utils/channelManager.js';
import { MessageProcessor } from './utils/messageProcessor.js';
import { CommandHandler } from './utils/commandHandler.js';
import { AIManager } from './ai/aiManager.js';
import { TTSManager } from './tts/ttsManager.js';
import { VoiceManager } from './utils/voiceManager.js';
import { DatabaseManager } from './database/databaseManager.js';
import { setChannelManager, setMessageProcessor, setCommandHandler, setAIManager, setTTSManager, setVoiceManager, setDatabaseManager } from './events/messageCreate.js';

// Create a new client instance with extended properties
interface ExtendedClient extends Client {
    commands?: Collection<string, any>;
}

const client: ExtendedClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ],
});

// Initialize commands collection
client.commands = new Collection();

// Initialize channel manager
const channelManager = new ChannelManager(client);
setChannelManager(channelManager);

// Initialize message processor
const messageProcessor = new MessageProcessor(client.user?.id);
setMessageProcessor(messageProcessor);

// Initialize command handler
const commandHandler = new CommandHandler(messageProcessor);
setCommandHandler(commandHandler);

// Initialize database manager first
const databaseManager = new DatabaseManager();
setDatabaseManager(databaseManager);

// Initialize AI manager with database dependency
const aiManager = new AIManager();
aiManager.setDatabaseManager(databaseManager);
setAIManager(aiManager);

// Initialize TTS manager
const ttsManager = new TTSManager();
setTTSManager(ttsManager);

// Initialize voice manager
const voiceManager = new VoiceManager(client);
setVoiceManager(voiceManager);

// Store managers reference in client for commands
(client as any).aiManager = aiManager;
(client as any).ttsManager = ttsManager;
(client as any).voiceManager = voiceManager;
(client as any).databaseManager = databaseManager;

// Load event handlers
loadEvents(client);

// Global error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

// Login to Discord with your client's token
client.login(config.token).catch((error) => {
    console.error('Failed to login:', error);
    process.exit(1);
});