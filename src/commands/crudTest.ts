import { SlashCommandBuilder } from 'discord.js';
import type { CommandInteraction } from 'discord.js';
import { Logger } from '../utils/logger.js';
import type { DatabaseManager } from '../database/databaseManager.js';
import { DatabaseCRUD } from '../database/operations.js';
import type { UserProfile, ChannelContext } from '../ai/contextManager.js';

export const data = new SlashCommandBuilder()
    .setName('crud-test')
    .setDescription('Test database CRUD operations')
    .addStringOption(option =>
        option.setName('operation')
            .setDescription('CRUD operation to test')
            .setRequired(true)
            .addChoices(
                { name: 'Test User Profile', value: 'user' },
                { name: 'Test Channel Context', value: 'channel' },
                { name: 'Test Conversation History', value: 'conversation' },
                { name: 'Test All Operations', value: 'all' },
                { name: 'Database Stats', value: 'stats' }
            ));

export async function execute(interaction: CommandInteraction, databaseManager: DatabaseManager) {
    try {
        await interaction.deferReply();

        if (!databaseManager.isReady()) {
            await interaction.editReply('❌ Database is not ready!');
            return;
        }

        const operation = interaction.options.get('operation')?.value as string;
        const db = databaseManager.getDatabase();
        const crud = new DatabaseCRUD(db);

        let result = '';

        switch (operation) {
            case 'user':
                result = await testUserProfile(crud, interaction.user.id, interaction.user.username);
                break;
            case 'channel':
                result = await testChannelContext(crud, interaction.channelId, interaction.channel?.type || 'unknown');
                break;
            case 'conversation':
                result = await testConversationHistory(crud, interaction.channelId, interaction.user.id);
                break;
            case 'all':
                result = await testAllOperations(crud, interaction);
                break;
            case 'stats':
                result = await getDatabaseStats(crud);
                break;
            default:
                result = '❌ Unknown operation';
        }

        // Split long messages if needed
        if (result.length > 2000) {
            const chunks = result.match(/.{1,2000}/g) || [result];
            await interaction.editReply(chunks[0]);
            for (let i = 1; i < chunks.length; i++) {
                await interaction.followUp(chunks[i]);
            }
        } else {
            await interaction.editReply(result);
        }

    } catch (error) {
        Logger.error('❌ CRUD test command failed:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await interaction.editReply(`❌ CRUD test failed: ${errorMsg}`);
    }
}

async function testUserProfile(crud: DatabaseCRUD, userId: string, username: string): Promise<string> {
    const results: string[] = [];
    results.push('🧪 **Testing User Profile CRUD Operations**\n');

    try {
        // Create test user profile
        const testProfile: UserProfile = {
            userId,
            username,
            displayName: `${username} (Test)`,
            interests: ['programming', 'discord', 'ai'],
            personality: ['helpful', 'technical', 'curious'],
            recentTopics: ['tech:javascript', 'tech:discord', 'interest:coding'],
            interactionCount: 5,
            lastSeen: Date.now(),
            preferredResponseStyle: 'technical',
            timezone: 'UTC',
            language: 'en'
        };

        // Test CREATE
        results.push('📝 Testing CREATE...');
        const created = await crud.createUserProfile(testProfile);
        results.push(created ? '✅ User profile created successfully' : '❌ Failed to create user profile');

        // Test READ
        results.push('\n📖 Testing READ...');
        const retrieved = await crud.getUserProfile(userId);
        if (retrieved) {
            results.push('✅ User profile retrieved successfully');
            results.push(`   Username: ${retrieved.username}`);
            results.push(`   Interests: ${retrieved.interests.join(', ')}`);
            results.push(`   Personality: ${retrieved.personality.join(', ')}`);
            results.push(`   Recent Topics: ${retrieved.recentTopics.join(', ')}`);
        } else {
            results.push('❌ Failed to retrieve user profile');
        }

        // Test UPDATE
        results.push('\n✏️ Testing UPDATE...');
        const updated = await crud.updateUserProfile(userId, {
            interactionCount: 10,
            interests: ['programming', 'discord', 'ai', 'testing'],
            personality: ['helpful', 'technical', 'curious', 'thorough']
        });
        results.push(updated ? '✅ User profile updated successfully' : '❌ Failed to update user profile');

        // Verify update
        const updatedProfile = await crud.getUserProfile(userId);
        if (updatedProfile) {
            results.push(`   Updated interaction count: ${updatedProfile.interactionCount}`);
            results.push(`   Updated interests: ${updatedProfile.interests.join(', ')}`);
        }

        // Test user stats
        results.push('\n📊 Testing USER STATS...');
        const stats = await crud.getUserStats(userId);
        if (stats) {
            results.push('✅ User stats retrieved successfully');
            results.push(`   Interests: ${stats.interests}, Personality Traits: ${stats.personalityTraits}`);
        } else {
            results.push('❌ Failed to retrieve user stats');
        }

    } catch (error) {
        results.push(`❌ Error during user profile test: ${error}`);
    }

    return results.join('\n');
}

async function testChannelContext(crud: DatabaseCRUD, channelId: string, channelType: string): Promise<string> {
    const results: string[] = [];
    results.push('🧪 **Testing Channel Context CRUD Operations**\n');

    try {
        // Create test channel context
        const testContext: ChannelContext = {
            channelId,
            channelName: 'test-channel',
            channelType,
            recentTopics: ['tech:discord', 'tech:bots', 'general:testing'],
            activeUsers: ['user1', 'user2', 'user3'],
            conversationTone: 'technical',
            lastActivity: Date.now()
        };

        // Test CREATE
        results.push('📝 Testing CREATE...');
        const created = await crud.createChannelContext(testContext);
        results.push(created ? '✅ Channel context created successfully' : '❌ Failed to create channel context');

        // Test READ
        results.push('\n📖 Testing READ...');
        const retrieved = await crud.getChannelContext(channelId);
        if (retrieved) {
            results.push('✅ Channel context retrieved successfully');
            results.push(`   Channel Name: ${retrieved.channelName}`);
            results.push(`   Conversation Tone: ${retrieved.conversationTone}`);
            results.push(`   Recent Topics: ${retrieved.recentTopics.join(', ')}`);
            results.push(`   Active Users: ${retrieved.activeUsers.join(', ')}`);
        } else {
            results.push('❌ Failed to retrieve channel context');
        }

        // Test UPDATE
        results.push('\n✏️ Testing UPDATE...');
        const updated = await crud.updateChannelContext(channelId, {
            conversationTone: 'casual',
            recentTopics: ['tech:discord', 'tech:bots', 'general:testing', 'fun:memes']
        });
        results.push(updated ? '✅ Channel context updated successfully' : '❌ Failed to update channel context');

        // Test channel stats
        results.push('\n📊 Testing CHANNEL STATS...');
        const stats = await crud.getChannelStats(channelId);
        if (stats) {
            results.push('✅ Channel stats retrieved successfully');
            results.push(`   Topics: ${stats.recentTopics}, Active Users: ${stats.activeUsers}`);
        } else {
            results.push('❌ Failed to retrieve channel stats');
        }

    } catch (error) {
        results.push(`❌ Error during channel context test: ${error}`);
    }

    return results.join('\n');
}

async function testConversationHistory(crud: DatabaseCRUD, channelId: string, userId: string): Promise<string> {
    const results: string[] = [];
    results.push('🧪 **Testing Conversation History CRUD Operations**\n');

    try {
        // Test CREATE conversation messages
        results.push('📝 Testing CREATE messages...');
        
        const message1Id = await crud.addConversationMessage({
            channelId,
            userId,
            role: 'user',
            content: 'Hello, this is a test message!',
            timestamp: Date.now() - 60000, // 1 minute ago
            author: 'TestUser',
            relevanceScore: 0.8
        });

        const message2Id = await crud.addConversationMessage({
            channelId,
            userId: null, // Bot message
            role: 'assistant',
            content: 'Hello! I received your test message successfully.',
            timestamp: Date.now() - 30000, // 30 seconds ago
            author: 'Bot',
            relevanceScore: 0.9
        });

        results.push(message1Id ? '✅ User message added successfully' : '❌ Failed to add user message');
        results.push(message2Id ? '✅ Bot message added successfully' : '❌ Failed to add bot message');

        // Test READ conversation history
        results.push('\n📖 Testing READ conversation history...');
        const history = await crud.getConversationHistory(channelId, 10);
        if (history.length > 0) {
            results.push(`✅ Retrieved ${history.length} messages from conversation history`);
            for (const msg of history.slice(-2)) { // Show last 2 messages
                results.push(`   [${msg.role}] ${msg.author}: ${msg.content.substring(0, 50)}...`);
            }
        } else {
            results.push('❌ No conversation history found');
        }

    } catch (error) {
        results.push(`❌ Error during conversation history test: ${error}`);
    }

    return results.join('\n');
}

async function testAllOperations(crud: DatabaseCRUD, interaction: CommandInteraction): Promise<string> {
    const results: string[] = [];
    results.push('🧪 **Running Complete CRUD Test Suite**\n');

    // Test user profile operations
    const userResult = await testUserProfile(crud, interaction.user.id, interaction.user.username);
    results.push(userResult);
    results.push('\n' + '='.repeat(50) + '\n');

    // Test channel context operations
    const channelResult = await testChannelContext(crud, interaction.channelId, interaction.channel?.type || 'unknown');
    results.push(channelResult);
    results.push('\n' + '='.repeat(50) + '\n');

    // Test conversation history operations
    const conversationResult = await testConversationHistory(crud, interaction.channelId, interaction.user.id);
    results.push(conversationResult);
    results.push('\n' + '='.repeat(50) + '\n');

    // Test database stats
    const statsResult = await getDatabaseStats(crud);
    results.push(statsResult);

    return results.join('\n');
}

async function getDatabaseStats(crud: DatabaseCRUD): Promise<string> {
    const results: string[] = [];
    results.push('📊 **Database Statistics**\n');

    try {
        const stats = await crud.getDatabaseStats();
        if (stats) {
            results.push('✅ Database stats retrieved successfully');
            results.push(`   👥 Users: ${stats.users}`);
            results.push(`   📺 Channels: ${stats.channels}`);
            results.push(`   💬 Messages: ${stats.messages}`);
            results.push(`   🎯 Interests: ${stats.interests}`);
            results.push(`   🧠 Personality Traits: ${stats.personalityTraits}`);
            results.push(`   🏷️ Topics: ${stats.topics}`);
        } else {
            results.push('❌ Failed to retrieve database stats');
        }
    } catch (error) {
        results.push(`❌ Error retrieving database stats: ${error}`);
    }

    return results.join('\n');
}