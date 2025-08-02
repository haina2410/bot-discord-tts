import { Message } from 'discord.js';
import { Logger } from '../utils/logger.js';

export const databaseTestCommand = {
    name: 'db-test',
    description: 'Kiểm tra kết nối và chức năng database',
    async execute(message: Message) {
        try {
            Logger.info(`🧪 Database test command executed by ${message.author.tag}`);

            // Check if database manager is available
            const databaseManager = (message.client as any).databaseManager;

            if (!databaseManager) {
                await message.reply('❌ Không tìm thấy Database Manager. Vui lòng kiểm tra cấu hình bot.');
                return;
            }

            await message.reply('🧪 Bắt đầu kiểm tra tích hợp database...');

            // Test 1: Check if database is ready
            const isReady = databaseManager.isReady();
            if (!isReady) {
                await message.reply('❌ Database chưa sẵn sàng. Vui lòng đợi bot khởi động hoàn tất.');
                return;
            }

            // Test 2: Get database statistics
            const stats = databaseManager.getStats();
            if (!stats) {
                await message.reply('❌ Không thể lấy thống kê database.');
                return;
            }

            // Test 3: Perform health check
            const healthCheck = await databaseManager.healthCheck();
            
            // Test 4: Try a simple query
            let queryTest = false;
            try {
                const db = databaseManager.getDatabase();
                const result = db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"').get() as any;
                queryTest = result.count > 0;
            } catch (error) {
                Logger.error('Query test failed:', error);
            }

            // Test 5: Test transaction functionality
            let transactionTest = false;
            try {
                const result = databaseManager.transaction((db) => {
                    return db.prepare('SELECT 1 as test').get();
                });
                transactionTest = result !== null;
            } catch (error) {
                Logger.error('Transaction test failed:', error);
            }

            // Compile results
            const testResults = {
                ready: isReady,
                stats: stats !== null,
                health: healthCheck.healthy,
                query: queryTest,
                transaction: transactionTest
            };

            const passedTests = Object.values(testResults).filter(Boolean).length;
            const totalTests = Object.keys(testResults).length;

            // Create detailed response
            const embed = {
                title: '🗄️ Database Test Results',
                fields: [
                    { name: '🔗 Connection Status', value: testResults.ready ? '✅ Ready' : '❌ Not Ready', inline: true },
                    { name: '📊 Statistics', value: testResults.stats ? '✅ Available' : '❌ Failed', inline: true },
                    { name: '🏥 Health Check', value: testResults.health ? '✅ Healthy' : '❌ Unhealthy', inline: true },
                    { name: '🔍 Query Test', value: testResults.query ? '✅ Passed' : '❌ Failed', inline: true },
                    { name: '🔄 Transaction Test', value: testResults.transaction ? '✅ Passed' : '❌ Failed', inline: true },
                    { name: '📈 Overall Score', value: `${passedTests}/${totalTests} tests passed`, inline: true },
                    { name: '💾 Database Info', value: `${stats.sizeMB}MB • ${stats.tables} tables • ${stats.journalMode} mode`, inline: false }
                ],
                color: passedTests === totalTests ? 0x00FF00 : (passedTests > totalTests / 2 ? 0xFFFF00 : 0xFF0000),
                timestamp: new Date().toISOString()
            };

            if (healthCheck.error) {
                embed.fields.push({ name: '❌ Health Check Error', value: healthCheck.error, inline: false });
            }

            // Add detailed health check info
            if (healthCheck.checks) {
                const healthDetails = Object.entries(healthCheck.checks)
                    .map(([check, passed]) => `${passed ? '✅' : '❌'} ${check}`)
                    .join('\n');
                embed.fields.push({ name: '🏥 Health Check Details', value: healthDetails, inline: false });
            }

            await message.reply({ embeds: [embed] });

            if (passedTests === totalTests) {
                Logger.success('✅ Database integration test passed completely');
            } else {
                Logger.warn(`⚠️ Database integration test partially failed: ${passedTests}/${totalTests} tests passed`);
            }

        } catch (error) {
            Logger.error('❌ Database test command error:', error);
            await message.reply(`❌ Database test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
};

export const databaseSchemaTestCommand = {
    name: 'db-schema-test',
    description: 'Test database schema and table structure',
    async execute(message: Message) {
        try {
            Logger.info(`🧪 Database schema test command executed by ${message.author.tag}`);

            const databaseManager = (message.client as any).databaseManager;

            if (!databaseManager || !databaseManager.isReady()) {
                await message.reply('❌ Database not ready. Use `!db-test` to check database status.');
                return;
            }

            await message.reply('🧪 Testing database schema structure...');

            const db = databaseManager.getDatabase();

            // Test 1: Check required tables exist
            const requiredTables = [
                'user_profiles',
                'user_interests',
                'user_personality_traits',
                'user_recent_topics',
                'channel_contexts',
                'channel_recent_topics',
                'channel_active_users',
                'conversation_history',
                'message_topics',
                'database_metadata'
            ];

            const existingTables = db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
            `).all().map((row: any) => row.name);

            const missingTables = requiredTables.filter(table => !existingTables.includes(table));
            const extraTables = existingTables.filter(table => !requiredTables.includes(table));

            // Test 2: Check views exist
            const views = db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='view'
                ORDER BY name
            `).all().map((row: any) => row.name);

            // Test 3: Check indexes exist
            const indexes = db.prepare(`
                SELECT name, tbl_name FROM sqlite_master 
                WHERE type='index' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
            `).all();

            // Test 4: Check foreign keys are enabled
            const foreignKeysEnabled = db.pragma('foreign_keys')[0].foreign_keys === 1;

            // Test 5: Check triggers exist
            const triggers = db.prepare(`
                SELECT name, tbl_name FROM sqlite_master 
                WHERE type='trigger'
                ORDER BY name
            `).all();

            // Test 6: Check database metadata
            const metadata = db.prepare(`
                SELECT key, value FROM database_metadata
            `).all();

            // Compile results
            const embed = {
                title: '🗄️ Database Schema Test Results',
                fields: [
                    { 
                        name: '📋 Tables Status', 
                        value: `✅ ${existingTables.length} tables found\n${missingTables.length > 0 ? `❌ Missing: ${missingTables.join(', ')}` : '✅ All required tables present'}`, 
                        inline: false 
                    },
                    { 
                        name: '👁️ Views', 
                        value: `${views.length} views: ${views.join(', ') || 'None'}`, 
                        inline: true 
                    },
                    { 
                        name: '📇 Indexes', 
                        value: `${indexes.length} indexes created`, 
                        inline: true 
                    },
                    { 
                        name: '🔗 Foreign Keys', 
                        value: foreignKeysEnabled ? '✅ Enabled' : '❌ Disabled', 
                        inline: true 
                    },
                    { 
                        name: '⚡ Triggers', 
                        value: `${triggers.length} triggers: ${triggers.map((t: any) => t.name).join(', ') || 'None'}`, 
                        inline: false 
                    },
                    { 
                        name: '📊 Metadata', 
                        value: metadata.map((m: any) => `${m.key}: ${m.value}`).join('\n') || 'None', 
                        inline: false 
                    }
                ],
                color: missingTables.length === 0 && foreignKeysEnabled ? 0x00FF00 : 0xFFFF00,
                timestamp: new Date().toISOString()
            };

            if (extraTables.length > 0) {
                embed.fields.push({ 
                    name: '➕ Extra Tables', 
                    value: extraTables.join(', '), 
                    inline: false 
                });
            }

            await message.reply({ embeds: [embed] });

            Logger.success('✅ Database schema test completed');

        } catch (error) {
            Logger.error('❌ Database schema test error:', error);
            await message.reply(`❌ Schema test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
};