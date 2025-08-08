import { Message } from 'discord.js';
import { Logger } from './logger.js';
import { MessageProcessor } from './messageProcessor.js';
import { ttsTestCommand, aiTtsTestCommand } from '../commands/ttsTest.js';
import { databaseTestCommand, databaseSchemaTestCommand } from '../commands/databaseTest.js';
import listeningModeCommand, { setMessageProcessor as setListeningCommandMessageProcessor } from '../commands/listeningMode.js';
import { joinVoiceCommand, leaveVoiceCommand } from '../commands/joinVoice.js';
import ignoreChannelCommand from '../commands/ignoreChannel.js';
import listenChannelCommand from '../commands/listenChannel.js';
import setPrefixCommand from '../commands/setPrefix.js';

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
        
        // Set message processor for listening command
        setListeningCommandMessageProcessor(messageProcessor);
        
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
        const commandData = this.messageProcessor.extractCommand(message.content, message.guild?.id);
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
            await message.reply('❌ Đã xảy ra lỗi khi thực hiện lệnh đó.');
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
            description: 'Kiểm tra xem bot có hoạt động không',
            usage: '!test',
            aliases: ['ping'],
            execute: async (message: Message) => {
                const startTime = Date.now();
                const reply = await message.reply('🤖 Bot đang hoạt động! Đang tính ping...');
                const endTime = Date.now();
                const ping = endTime - startTime;
                
                await reply.edit(`🤖 Bot đang hoạt động!\n📡 Ping: ${ping}ms\n⚡ Sẵn sàng tích hợp AI!`);
            }
        });

        // Help command
        this.registerCommand({
            name: 'help',
            description: 'Hiển thị các lệnh có sẵn',
            usage: '!help [lệnh]',
            aliases: ['commands'],
            execute: async (message: Message, args: string[]) => {
                if (args.length > 0) {
                    // Show help for specific command
                    const commandName = args[0]?.toLowerCase();
                    if (!commandName) {
                        await message.reply('❌ Vui lòng chỉ định tên lệnh. Sử dụng `!help` để xem tất cả lệnh.');
                        return;
                    }
                    const command = this.commands.get(commandName);
                    
                    if (command) {
                        const embed = {
                            title: `📖 Trợ giúp: ${command.name}`,
                            description: command.description,
                            fields: [
                                { name: 'Cách sử dụng', value: `\`${command.usage}\``, inline: true },
                                { name: 'Tên khác', value: command.aliases?.join(', ') || 'Không có', inline: true }
                            ],
                            color: 0x00AE86
                        };
                        await message.reply({ embeds: [embed] });
                    } else {
                        await message.reply(`❌ Không tìm thấy lệnh \`${commandName}\`. Sử dụng \`!help\` để xem tất cả lệnh.`);
                    }
                } else {
                    // Show all commands
                    const commands = this.getCommands();
                    const commandList = commands.map(cmd => `\`!${cmd.name}\` - ${cmd.description}`).join('\n');
                    
                    const embed = {
                        title: '📚 Các Lệnh Có Sẵn',
                        description: commandList || 'Không có lệnh nào.',
                        footer: { text: 'Sử dụng !help <lệnh> để xem thông tin chi tiết' },
                        color: 0x00AE86
                    };
                    
                    await message.reply({ embeds: [embed] });
                }
            }
        });

        // AI stats command
        this.registerCommand({
            name: 'ai-stats',
            description: 'Hiển thị thống kê hệ thống AI và thông tin ngữ cảnh',
            usage: '!ai-stats',
            aliases: ['aistats'],
            execute: async (message: Message) => {
                try {
                    const aiManager = (message.client as any).aiManager;
                    
                    if (!aiManager) {
                        await message.reply('❌ AI Manager chưa được khởi tạo. Vui lòng kiểm tra logs.');
                        return;
                    }

                    const stats = await aiManager.getStats();
                    
                    if (!stats) {
                        await message.reply('❌ Không thể lấy thống kê AI. Hệ thống có thể chưa khởi tạo hoàn toàn.');
                        return;
                    }
                    
                    const embed = {
                        title: '🧠 Thống Kê Hệ Thống AI',
                        fields: [
                            { name: '💬 Cuộc trò chuyện', value: (stats.totalConversations || 0).toString(), inline: true },
                            { name: '📝 Tổng tin nhắn', value: (stats.totalMessages || 0).toString(), inline: true },
                            { name: '📊 TB tin nhắn/cuộc trò chuyện', value: (stats.averageMessagesPerConversation || 0).toString(), inline: true },
                            { name: '👥 Hồ sơ người dùng', value: (stats.userProfiles || 0).toString(), inline: true },
                            { name: '📺 Ngữ cảnh kênh', value: (stats.channelContexts || 0).toString(), inline: true },
                            { name: '🔄 Tổng tương tác', value: (stats.totalInteractions || 0).toString(), inline: true },
                            { name: '🤖 Mô hình AI', value: stats.modelInfo?.model || 'Không xác định', inline: true },
                            { name: '🎛️ Temperature', value: (stats.modelInfo?.temperature || 0).toString(), inline: true },
                            { name: '📏 Max Tokens', value: (stats.modelInfo?.maxTokens || 0).toString(), inline: true },
                        ],
                        color: 0x00AE86,
                        timestamp: new Date().toISOString(),
                        footer: { text: 'Hệ thống AI đang học hỏi về các thành viên server' }
                    };
                    
                    await message.reply({ embeds: [embed] });
                } catch (error) {
                    Logger.error('Error in ai-stats command:', error);
                    await message.reply('❌ Đã xảy ra lỗi khi lấy thống kê AI.');
                }
            }
        });

        // AI test command
        this.registerCommand({
            name: 'ai-test',
            description: 'Kiểm tra tạo phản hồi AI',
            usage: '!ai-test',
            aliases: ['aitest'],
            execute: async (message: Message) => {
                try {
                    // This will be set by the main bot when AIManager is initialized
                    const aiManager = (message.client as any).aiManager;
                    
                    if (!aiManager) {
                        await message.reply('❌ AI Manager chưa được khởi tạo. Vui lòng kiểm tra logs.');
                        return;
                    }

                    const reply = await message.reply('🧠 Đang kiểm tra tạo phản hồi AI...');
                    
                    try {
                        const testResponse = await aiManager.testAI();
                        await reply.edit(`✅ Kiểm tra AI thành công!\n\n**Phản hồi:** ${testResponse}`);
                    } catch (error) {
                        await reply.edit(`❌ Kiểm tra AI thất bại: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
                    }
                } catch (error) {
                    Logger.error('Error in ai-test command:', error);
                    await message.reply('❌ Đã xảy ra lỗi trong quá trình kiểm tra AI.');
                }
            }
        });

        // Status command
        this.registerCommand({
            name: 'status',
            description: 'Hiển thị trạng thái và thông tin bot',
            usage: '!status',
            aliases: ['info'],
            execute: async (message: Message) => {
                const uptime = process.uptime();
                const uptimeString = this.formatUptime(uptime);
                
                const embed = {
                    title: '🤖 Trạng Thái Bot',
                    fields: [
                        { name: '⏱️ Thời gian hoạt động', value: uptimeString, inline: true },
                        { name: '📊 Sử dụng bộ nhớ', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
                        { name: '🏷️ Phiên bản', value: 'v1.0.0-dev', inline: true },
                        { name: '🧠 Trạng thái AI', value: (message.client as any).aiManager ? 'Đã tích hợp ✅' : 'Chưa tích hợp ❌', inline: true },
                        { name: '🔊 Trạng thái TTS', value: (message.client as any).ttsManager ? 'Đã tích hợp ✅' : 'Chưa tích hợp ❌', inline: true },
                        { name: '🗄️ Trạng thái Database', value: (message.client as any).databaseManager?.isReady() ? 'Đã kết nối ✅' : 'Chưa kết nối ❌', inline: true }
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

        // Database test command
        this.registerCommand({
            name: databaseTestCommand.name,
            description: databaseTestCommand.description,
            usage: `!${databaseTestCommand.name}`,
            execute: async (message: Message, args: string[]) => {
                await databaseTestCommand.execute(message);
            }
        });

        // Database schema test command
        this.registerCommand({
            name: databaseSchemaTestCommand.name,
            description: databaseSchemaTestCommand.description,
            usage: `!${databaseSchemaTestCommand.name}`,
            execute: async (message: Message, args: string[]) => {
                await databaseSchemaTestCommand.execute(message);
            }
        });

        // Listening mode command
        this.registerCommand({
            name: listeningModeCommand.name,
            description: listeningModeCommand.description,
            usage: listeningModeCommand.usage,
            aliases: listeningModeCommand.aliases,
            execute: async (message: Message, args: string[]) => {
                await listeningModeCommand.execute(message, args);
            }
        });

        // Join voice command
        this.registerCommand({
            name: joinVoiceCommand.name,
            description: joinVoiceCommand.description,
            usage: joinVoiceCommand.usage,
            aliases: joinVoiceCommand.aliases,
            execute: async (message: Message, args: string[]) => {
                await joinVoiceCommand.execute(message);
            }
        });

        // Leave voice command
        this.registerCommand({
            name: leaveVoiceCommand.name,
            description: leaveVoiceCommand.description,
            usage: leaveVoiceCommand.usage,
            aliases: leaveVoiceCommand.aliases,
            execute: async (message: Message, args: string[]) => {
                await leaveVoiceCommand.execute(message);
            }
        });

        // Ignore channel command
        this.registerCommand({
            name: ignoreChannelCommand.name,
            description: ignoreChannelCommand.description,
            usage: ignoreChannelCommand.usage,
            aliases: ignoreChannelCommand.aliases,
            execute: async (message: Message, args: string[]) => {
                await ignoreChannelCommand.execute(message, args);
            }
        });

        // Listen channel command
        this.registerCommand({
            name: listenChannelCommand.name,
            description: listenChannelCommand.description,
            usage: listenChannelCommand.usage,
            aliases: listenChannelCommand.aliases,
            execute: async (message: Message, args: string[]) => {
                await listenChannelCommand.execute(message, args);
            }
        });

        // Set prefix command
        this.registerCommand({
            name: setPrefixCommand.name,
            description: setPrefixCommand.description,
            usage: setPrefixCommand.usage,
            aliases: setPrefixCommand.aliases,
            execute: async (message: Message, args: string[]) => {
                await setPrefixCommand.execute(message, args);
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