import { Client, GatewayIntentBits, Collection } from 'discord.js';
import dotenv from 'dotenv';
import { config } from '../config/bot.js';
import { loadEvents } from './utils/eventLoader.js';
import { ChannelManager } from './utils/channelManager.js';
import { setChannelManager } from './events/messageCreate.js';

// Load environment variables
dotenv.config();

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