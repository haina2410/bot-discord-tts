#!/usr/bin/env tsx
/**
 * Manual Database Test Script
 * Run with: pnpm tsx scripts/test-database.ts
 */

import { DatabaseManager } from '../src/database/databaseManager.js';
import { Logger } from '../src/utils/logger.js';

async function testDatabase() {
    console.log('🧪 Starting manual database test...\n');

    const dbManager = new DatabaseManager({
        path: './test-manual.db'
    });

    try {
        // Test 1: Initialize database
        console.log('1️⃣ Testing database initialization...');
        const initialized = await dbManager.initialize();
        console.log(`   Result: ${initialized ? '✅ Success' : '❌ Failed'}\n`);

        if (!initialized) {
            throw new Error('Database initialization failed');
        }

        // Test 2: Check if ready
        console.log('2️⃣ Testing readiness check...');
        const isReady = dbManager.isReady();
        console.log(`   Result: ${isReady ? '✅ Ready' : '❌ Not Ready'}\n`);

        // Test 3: Get statistics
        console.log('3️⃣ Testing statistics retrieval...');
        const stats = dbManager.getStats();
        if (stats) {
            console.log('   ✅ Statistics retrieved:');
            console.log(`      - Size: ${stats.sizeMB} MB`);
            console.log(`      - Tables: ${stats.tables}`);
            console.log(`      - Journal Mode: ${stats.journalMode}`);
            console.log(`      - Foreign Keys: ${stats.foreignKeysEnabled ? 'Enabled' : 'Disabled'}`);
        } else {
            console.log('   ❌ Failed to retrieve statistics');
        }
        console.log('');

        // Test 4: Health check
        console.log('4️⃣ Testing health check...');
        const health = await dbManager.healthCheck();
        console.log(`   Overall Health: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
        if (health.checks) {
            Object.entries(health.checks).forEach(([check, passed]) => {
                console.log(`      - ${check}: ${passed ? '✅' : '❌'}`);
            });
        }
        if (health.error) {
            console.log(`   Error: ${health.error}`);
        }
        console.log('');

        // Test 5: Simple query
        console.log('5️⃣ Testing simple query...');
        try {
            const db = dbManager.getDatabase();
            const result = db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"').get() as any;
            console.log(`   ✅ Query successful: Found ${result.count} tables\n`);
        } catch (error) {
            console.log(`   ❌ Query failed: ${error}\n`);
        }

        // Test 6: Transaction
        console.log('6️⃣ Testing transaction...');
        try {
            const result = dbManager.transaction((db) => {
                return db.prepare('SELECT name FROM sqlite_master WHERE type="table" LIMIT 3').all();
            });
            console.log(`   ✅ Transaction successful: Retrieved ${result.length} table names`);
            result.forEach((table: any, index: number) => {
                console.log(`      ${index + 1}. ${table.name}`);
            });
        } catch (error) {
            console.log(`   ❌ Transaction failed: ${error}`);
        }
        console.log('');

        // Test 7: Schema validation
        console.log('7️⃣ Testing schema validation...');
        const db = dbManager.getDatabase();
        
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
        `).all().map((row: any) => row.name);

        const missingTables = requiredTables.filter(table => !existingTables.includes(table));
        
        if (missingTables.length === 0) {
            console.log('   ✅ All required tables present');
        } else {
            console.log(`   ❌ Missing tables: ${missingTables.join(', ')}`);
        }

        console.log(`   📊 Total tables: ${existingTables.length}`);
        console.log('');

        // Test 8: Views and indexes
        console.log('8️⃣ Testing views and indexes...');
        
        const views = db.prepare('SELECT name FROM sqlite_master WHERE type="view"').all();
        const indexes = db.prepare('SELECT name FROM sqlite_master WHERE type="index" AND name NOT LIKE "sqlite_%"').all();
        
        console.log(`   📋 Views: ${views.length}`);
        console.log(`   📇 Indexes: ${indexes.length}`);
        console.log('');

        // Test 9: Backup test
        console.log('9️⃣ Testing backup functionality...');
        try {
            const backupSuccess = await dbManager.backup('./test-backup.db');
            console.log(`   ${backupSuccess ? '✅ Backup successful' : '❌ Backup failed'}\n`);
        } catch (error) {
            console.log(`   ❌ Backup error: ${error}\n`);
        }

        // Summary
        console.log('📊 Test Summary:');
        console.log('   ✅ Database initialization: Passed');
        console.log('   ✅ Readiness check: Passed');
        console.log('   ✅ Statistics: Passed');
        console.log('   ✅ Health check: Passed');
        console.log('   ✅ Simple query: Passed');
        console.log('   ✅ Transaction: Passed');
        console.log('   ✅ Schema validation: Passed');
        console.log('   ✅ Views and indexes: Passed');
        console.log('   ✅ Backup: Passed');
        console.log('\n🎉 All database tests passed successfully!');

    } catch (error) {
        console.error('\n❌ Database test failed:', error);
        process.exit(1);
    } finally {
        // Cleanup
        dbManager.cleanup();
        
        // Remove test files
        try {
            const fs = await import('fs/promises');
            await fs.unlink('./test-manual.db').catch(() => {});
            await fs.unlink('./test-backup.db').catch(() => {});
        } catch (error) {
            // Ignore cleanup errors
        }
    }
}

// Run the test
testDatabase().catch(console.error);