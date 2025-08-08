import { Message, User } from 'discord.js';
import { Logger } from './logger.js';

export interface ListeningMode {
    mode: 'mentions-only' | 'smart-listening' | 'always-listen' | 'disabled';
    threshold?: number; // Relevance threshold for smart-listening mode (0.0 - 1.0)
}

export interface ProcessedMessage {
    id: string;
    content: string;
    cleanContent: string;
    author: {
        id: string;
        username: string;
        displayName?: string;
        tag: string;
        bot: boolean;
    };
    channel: {
        id: string;
        name: string;
        type: string;
        isListening: boolean;
    };
    guild: {
        id?: string;
        name?: string;
    };
    timestamp: number;
    mentions: {
        users: string[];
        roles: string[];
        channels: string[];
        everyone: boolean;
    };
    attachments: {
        count: number;
        urls: string[];
    };
    messageType: 'command' | 'mention' | 'regular';
    isReply: boolean;
    replyTo?: string;
}

export class MessageProcessor {
    private commandPrefixes = ['!', '/', '$', '?'];
    private botUserId?: string;
    private channelListeningModes: Map<string, ListeningMode> = new Map();
    private defaultListeningMode: ListeningMode = { 
        mode: 'smart-listening', 
        threshold: 0.6 
    };

    constructor(botUserId?: string) {
        this.botUserId = botUserId;
    }

    /**
     * Process a message and extract all relevant information
     */
    processMessage(message: Message, channelInfo: { name: string; type: string; isListening: boolean }): ProcessedMessage {
        const processedMessage: ProcessedMessage = {
            id: message.id,
            content: message.content,
            cleanContent: this.cleanMessageContent(message.content),
            author: {
                id: message.author.id,
                username: message.author.username,
                displayName: message.author.displayName || undefined,
                tag: message.author.tag,
                bot: message.author.bot,
            },
            channel: {
                id: message.channel.id,
                ...channelInfo,
            },
            guild: {
                id: message.guild?.id,
                name: message.guild?.name,
            },
            timestamp: message.createdTimestamp,
            mentions: {
                users: message.mentions.users.map(user => user.id),
                roles: message.mentions.roles.map(role => role.id),
                channels: message.mentions.channels.map(channel => channel.id),
                everyone: message.mentions.everyone,
            },
            attachments: {
                count: message.attachments.size,
                urls: message.attachments.map(attachment => attachment.url),
            },
            messageType: this.determineMessageType(message),
            isReply: message.reference !== null,
            replyTo: message.reference?.messageId,
        };

        return processedMessage;
    }

    /**
     * Clean message content by removing mentions, extra whitespace, etc.
     */
    private cleanMessageContent(content: string): string {
        return content
            // Remove user mentions
            .replace(/<@!?\d+>/g, '@user')
            // Remove role mentions
            .replace(/<@&\d+>/g, '@role')
            // Remove channel mentions
            .replace(/<#\d+>/g, '#channel')
            // Remove custom emojis
            .replace(/<a?:\w+:\d+>/g, ':emoji:')
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Determine the type of message (command, mention, or regular)
     */
    private determineMessageType(message: Message): 'command' | 'mention' | 'regular' {
        // Check if it's a command
        if (this.isCommand(message.content)) {
            return 'command';
        }

        // Check if bot is mentioned
        if (this.botUserId && message.mentions.users.has(this.botUserId)) {
            return 'mention';
        }

        // Check if it's a reply to the bot
        if (message.reference && this.botUserId) {
            // We'd need to fetch the referenced message to check if it's from the bot
            // For now, we'll assume it might be relevant
            return 'mention';
        }

        return 'regular';
    }

    /**
     * Check if a message is a command
     */
    private isCommand(content: string): boolean {
        const trimmed = content.trim();
        return this.commandPrefixes.some(prefix => trimmed.startsWith(prefix));
    }

    /**
     * Extract command and arguments from message
     */
    extractCommand(content: string): { command: string; args: string[] } | null {
        if (!this.isCommand(content)) {
            return null;
        }

        const trimmed = content.trim();
        const parts = trimmed.split(/\s+/);
        const command = parts[0]?.substring(1).toLowerCase() || ''; // Remove prefix and lowercase
        const args = parts.slice(1);

        return { command, args };
    }

    /**
     * Set listening mode for a specific channel
     */
    setChannelListeningMode(channelId: string, mode: ListeningMode): void {
        this.channelListeningModes.set(channelId, mode);
        Logger.info(`Set listening mode for channel ${channelId}: ${mode.mode}${mode.threshold ? ` (threshold: ${mode.threshold})` : ''}`);
    }

    /**
     * Get listening mode for a specific channel
     */
    getChannelListeningMode(channelId: string): ListeningMode {
        return this.channelListeningModes.get(channelId) || this.defaultListeningMode;
    }

    /**
     * Set default listening mode for all channels
     */
    setDefaultListeningMode(mode: ListeningMode): void {
        this.defaultListeningMode = mode;
        Logger.info(`Set default listening mode: ${mode.mode}${mode.threshold ? ` (threshold: ${mode.threshold})` : ''}`);
    }

    /**
     * Check if message should trigger AI response based on listening mode
     */
    shouldTriggerAI(processedMessage: ProcessedMessage): boolean {
        const listeningMode = this.getChannelListeningMode(processedMessage.channel.id);

        // Always respond to mentions and replies regardless of mode
        if (processedMessage.messageType === 'mention') {
            return true;
        }

        // Don't respond to commands (they have their own handlers)
        if (processedMessage.messageType === 'command') {
            return false;
        }

        // Check listening mode for regular messages
        switch (listeningMode.mode) {
            case 'disabled':
                return false;
            
            case 'mentions-only':
                return false; // Only mentions trigger responses
            
            case 'always-listen':
                return processedMessage.messageType === 'regular';
            
            case 'smart-listening':
                // Let the AI context manager decide based on relevance
                // The threshold will be used by the context manager
                return processedMessage.messageType === 'regular';
            
            default:
                return false;
        }
    }

    /**
     * Log processed message information
     */
    logMessage(processedMessage: ProcessedMessage) {
        Logger.debug(
            `${processedMessage.messageType.toUpperCase()} from ${processedMessage.author.tag} ` +
            `in #${processedMessage.channel.name}: ${processedMessage.content.substring(0, 100)}${processedMessage.content.length > 100 ? '...' : ''}`
        );

        if (processedMessage.mentions.users.length > 0) {
            Logger.debug(`Mentions ${processedMessage.mentions.users.length} user(s)`);
        }

        if (processedMessage.attachments.count > 0) {
            Logger.debug(`Has ${processedMessage.attachments.count} attachment(s)`);
        }

        if (processedMessage.isReply) {
            Logger.debug(`Reply to message ${processedMessage.replyTo}`);
        }
    }
}