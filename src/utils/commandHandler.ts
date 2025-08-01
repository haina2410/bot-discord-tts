import { Message } from 'discord.js';
import { Logger } from './logger.js';
import { MessageProcessor } from './messageProcessor.js';

export interface Command {
    name: string;
    description: string;
    usage: string;
    aliases?: string[];
    execute: (message: Message, args: string[]) => Promise<void>;
}

export class CommandHandler {
    private commands = new Map<string, Command>();
    private messageProcessor: MessageProcessor;

    constructor(messageProcessor: MessageProcessor) {
        this.messageProcessor = messageProcessor;
        this.registerDefaultCommands();
    }

    /**
     * Register a command
     */
    registerCommand(command: Command) {
        this.commands.set(command.name, command);
        
        // Register aliases
        if (command.aliases) {
            command.aliases.forEach(alias => {
                this.commands.set(alias, command);
            });
        }

        Logger.debug(`Registered command: ${command.name}`);
    }

    /**
     * Handle a command message
     */
    async handleCommand(message: Message): Promise<boolean> {
        const commandData = this.messageProcessor.extractCommand(message.content);
        if (!commandData) {
            return false;
        }

        const { command, args } = commandData;
        const commandObj = this.commands.get(command);

        if (!commandObj) {
            // Unknown command - could respond with help or ignore
            Logger.debug(`Unknown command: ${command}`);
            return false;
        }

        try {
            Logger.info(`⚡ Executing command: ${command} by ${message.author.tag}`);
            await commandObj.execute(message, args);
            return true;
        } catch (error) {
            Logger.error(`Error executing command ${command}:`, error);
            await message.reply('❌ An error occurred while executing that command.');
            return false;
        }
    }

    /**
     * Get all registered commands
     */
    getCommands(): Command[] {
        // Return unique commands (no duplicates from aliases)
        const uniqueCommands = new Map<string, Command>();
        this.commands.forEach((command, name) => {
            if (command.name === name) { // Only include the main name, not aliases
                uniqueCommands.set(name, command);
            }
        });
        return Array.from(uniqueCommands.values());
    }

    /**
     * Register default bot commands
     */
    private registerDefaultCommands() {
        // Test command
        this.registerCommand({
            name: 'test',
            description: 'Test if the bot is working',
            usage: '!test',
            aliases: ['ping'],
            execute: async (message: Message) => {
                const startTime = Date.now();
                const reply = await message.reply('🤖 Bot is working! Calculating ping...');
                const endTime = Date.now();
                const ping = endTime - startTime;
                
                await reply.edit(`🤖 Bot is working!\n📡 Ping: ${ping}ms\n⚡ Ready for AI integration!`);
            }
        });

        // Help command
        this.registerCommand({
            name: 'help',
            description: 'Show available commands',
            usage: '!help [command]',
            aliases: ['commands'],
            execute: async (message: Message, args: string[]) => {
                if (args.length > 0) {
                    // Show help for specific command
                    const commandName = args[0]?.toLowerCase();
                    if (!commandName) {
                        await message.reply('❌ Please specify a command name. Use `!help` to see all commands.');
                        return;
                    }
                    const command = this.commands.get(commandName);
                    
                    if (command) {
                        const embed = {
                            title: `📖 Help: ${command.name}`,
                            description: command.description,
                            fields: [
                                { name: 'Usage', value: `\`${command.usage}\``, inline: true },
                                { name: 'Aliases', value: command.aliases?.join(', ') || 'None', inline: true }
                            ],
                            color: 0x00AE86
                        };
                        await message.reply({ embeds: [embed] });
                    } else {
                        await message.reply(`❌ Command \`${commandName}\` not found. Use \`!help\` to see all commands.`);
                    }
                } else {
                    // Show all commands
                    const commands = this.getCommands();
                    const commandList = commands.map(cmd => `\`!${cmd.name}\` - ${cmd.description}`).join('\n');
                    
                    const embed = {
                        title: '📚 Available Commands',
                        description: commandList || 'No commands available.',
                        footer: { text: 'Use !help <command> for detailed information' },
                        color: 0x00AE86
                    };
                    
                    await message.reply({ embeds: [embed] });
                }
            }
        });

        // Status command
        this.registerCommand({
            name: 'status',
            description: 'Show bot status and information',
            usage: '!status',
            aliases: ['info'],
            execute: async (message: Message) => {
                const uptime = process.uptime();
                const uptimeString = this.formatUptime(uptime);
                
                const embed = {
                    title: '🤖 Bot Status',
                    fields: [
                        { name: '⏱️ Uptime', value: uptimeString, inline: true },
                        { name: '📊 Memory Usage', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
                        { name: '🏷️ Version', value: 'v1.0.0-dev', inline: true },
                        { name: '🧠 AI Status', value: 'Not yet integrated', inline: true },
                        { name: '🔊 TTS Status', value: 'Not yet integrated', inline: true },
                        { name: '💾 Database Status', value: 'Not yet integrated', inline: true }
                    ],
                    color: 0x00AE86,
                    timestamp: new Date().toISOString()
                };
                
                await message.reply({ embeds: [embed] });
            }
        });

        Logger.info(`✅ Registered ${this.getCommands().length} default commands`);
    }

    /**
     * Format uptime in a human-readable format
     */
    private formatUptime(seconds: number): string {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0) parts.push(`${secs}s`);

        return parts.join(' ') || '0s';
    }
}