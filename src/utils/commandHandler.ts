import { Message } from 'discord.js';
import { Logger } from './logger.js';
import { MessageProcessor } from './messageProcessor.js';
import { ttsTestCommand, aiTtsTestCommand } from '../commands/ttsTest.js';

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

        // AI stats command
        this.registerCommand({
            name: 'ai-stats',
            description: 'Show AI system statistics and context information',
            usage: '!ai-stats',
            aliases: ['aistats'],
            execute: async (message: Message) => {
                try {
                    const aiManager = (message.client as any).aiManager;
                    
                    if (!aiManager) {
                        await message.reply('❌ AI Manager not initialized. Please check the logs.');
                        return;
                    }

                    const stats = aiManager.getStats();
                    
                    const embed = {
                        title: '🧠 AI System Statistics',
                        fields: [
                            { name: '💬 Conversations', value: stats.totalConversations.toString(), inline: true },
                            { name: '📝 Total Messages', value: stats.totalMessages.toString(), inline: true },
                            { name: '📊 Avg Messages/Conv', value: stats.averageMessagesPerConversation.toString(), inline: true },
                            { name: '👥 User Profiles', value: stats.userProfiles.toString(), inline: true },
                            { name: '📺 Channel Contexts', value: stats.channelContexts.toString(), inline: true },
                            { name: '🔄 Total Interactions', value: stats.totalInteractions.toString(), inline: true },
                            { name: '🤖 AI Model', value: stats.modelInfo.model, inline: true },
                            { name: '🎛️ Temperature', value: stats.modelInfo.temperature.toString(), inline: true },
                            { name: '📏 Max Tokens', value: stats.modelInfo.maxTokens.toString(), inline: true },
                        ],
                        color: 0x00AE86,
                        timestamp: new Date().toISOString(),
                        footer: { text: 'AI system is learning about server members' }
                    };
                    
                    await message.reply({ embeds: [embed] });
                } catch (error) {
                    Logger.error('Error in ai-stats command:', error);
                    await message.reply('❌ An error occurred while fetching AI statistics.');
                }
            }
        });

        // AI test command
        this.registerCommand({
            name: 'ai-test',
            description: 'Test AI response generation',
            usage: '!ai-test',
            aliases: ['aitest'],
            execute: async (message: Message) => {
                try {
                    // This will be set by the main bot when AIManager is initialized
                    const aiManager = (message.client as any).aiManager;
                    
                    if (!aiManager) {
                        await message.reply('❌ AI Manager not initialized. Please check the logs.');
                        return;
                    }

                    const reply = await message.reply('🧠 Testing AI response generation...');
                    
                    try {
                        const testResponse = await aiManager.testAI();
                        await reply.edit(`✅ AI Test Successful!\n\n**Response:** ${testResponse}`);
                    } catch (error) {
                        await reply.edit(`❌ AI Test Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                } catch (error) {
                    Logger.error('Error in ai-test command:', error);
                    await message.reply('❌ An error occurred during AI testing.');
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
                        { name: '🧠 AI Status', value: (message.client as any).aiManager ? 'Integrated ✅' : 'Not integrated ❌', inline: true },
                        { name: '🔊 TTS Status', value: (message.client as any).ttsManager ? 'Integrated ✅' : 'Not integrated ❌', inline: true },
                        { name: '💾 Database Status', value: 'Not yet integrated', inline: true }
                    ],
                    color: 0x00AE86,
                    timestamp: new Date().toISOString()
                };
                
                await message.reply({ embeds: [embed] });
            }
        });

        // TTS test command
        this.registerCommand({
            name: ttsTestCommand.name,
            description: ttsTestCommand.description,
            usage: `!${ttsTestCommand.name}`,
            execute: async (message: Message, args: string[]) => {
                await ttsTestCommand.execute(message);
            }
        });

        // AI + TTS test command
        this.registerCommand({
            name: aiTtsTestCommand.name,
            description: aiTtsTestCommand.description,
            usage: `!${aiTtsTestCommand.name}`,
            execute: async (message: Message, args: string[]) => {
                await aiTtsTestCommand.execute(message);
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