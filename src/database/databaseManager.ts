import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Logger } from '../utils/logger.js';
import { config } from '../../config/bot.js';

export interface DatabaseConfig {
    path: string;
    options?: {
        readonly?: boolean;
        fileMustExist?: boolean;
        timeout?: number;
        verbose?: boolean;
    };
}

export class DatabaseManager {
    private db: Database.Database | null = null;
    private config: DatabaseConfig;
    private isInitialized = false;

    constructor(databaseConfig?: Partial<DatabaseConfig>) {
        this.config = {
            path: databaseConfig?.path || config.databasePath,
            options: {
                readonly: false,
                fileMustExist: false,
                timeout: 5000,
                verbose: process.env.NODE_ENV === 'development' ? (msg: string) => Logger.debug(msg) : undefined,
                ...databaseConfig?.options
            }
        };
    }

    /**
     * Initialize the database connection and setup
     */
    async initialize(): Promise<boolean> {
        try {
            Logger.info('🗄️ Initializing database...');
            Logger.info(`   Database path: ${this.config.path}`);

            // Create database connection
            this.db = new Database(this.config.path, this.config.options);

            // Configure database settings
            this.configureDatabase();

            // Run schema setup
            await this.setupSchema();

            // Verify database integrity
            const isValid = await this.verifyDatabase();
            if (!isValid) {
                throw new Error('Database integrity check failed');
            }

            this.isInitialized = true;
            Logger.success('✅ Database initialized successfully');
            
            // Log database info
            this.logDatabaseInfo();
            
            return true;

        } catch (error) {
            Logger.error('❌ Database initialization failed:', error);
            this.cleanup();
            return false;
        }
    }

    /**
     * Configure database settings for optimal performance
     */
    private configureDatabase(): void {
        if (!this.db) throw new Error('Database not connected');

        try {
            // Enable foreign key constraints
            this.db.pragma('foreign_keys = ON');
            
            // Set journal mode to WAL for better concurrent access
            this.db.pragma('journal_mode = WAL');
            
            // Set synchronous mode for balance of safety and performance
            this.db.pragma('synchronous = NORMAL');
            
            // Set cache size (negative value = KB, positive = pages)
            this.db.pragma('cache_size = -64000'); // 64MB cache
            
            // Set temp store to memory
            this.db.pragma('temp_store = MEMORY');
            
            // Set mmap size for memory-mapped I/O
            this.db.pragma('mmap_size = 268435456'); // 256MB
            
            Logger.info('🔧 Database configuration applied');

        } catch (error) {
            Logger.error('❌ Failed to configure database:', error);
            throw error;
        }
    }

    /**
     * Setup database schema from SQL file
     */
    private async setupSchema(): Promise<void> {
        if (!this.db) throw new Error('Database not connected');

        try {
            Logger.info('📋 Setting up database schema...');

            // Read schema file
            const schemaPath = join(process.cwd(), 'src', 'database', 'schema.sql');
            const schemaSQL = readFileSync(schemaPath, 'utf-8');

            // Execute schema SQL
            this.db.exec(schemaSQL);

            Logger.success('✅ Database schema created successfully');

        } catch (error) {
            Logger.error('❌ Failed to setup database schema:', error);
            throw error;
        }
    }

    /**
     * Verify database integrity and structure
     */
    private async verifyDatabase(): Promise<boolean> {
        if (!this.db) return false;

        try {
            Logger.info('🔍 Verifying database integrity...');

            // Check database integrity
            const integrityResult = this.db.pragma('integrity_check');
            if (integrityResult[0]?.integrity_check !== 'ok') {
                Logger.error('❌ Database integrity check failed:', integrityResult);
                return false;
            }

            // Verify required tables exist
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

            const existingTables = this.db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `).all().map((row: any) => row.name);

            const missingTables = requiredTables.filter(table => !existingTables.includes(table));
            if (missingTables.length > 0) {
                Logger.error('❌ Missing required tables:', missingTables);
                return false;
            }

            // Check schema version
            const versionResult = this.db.prepare(`
                SELECT value FROM database_metadata WHERE key = 'schema_version'
            `).get() as any;

            const schemaVersion = versionResult?.value || 'unknown';
            Logger.info(`📊 Database schema version: ${schemaVersion}`);

            Logger.success('✅ Database verification completed');
            return true;

        } catch (error) {
            Logger.error('❌ Database verification failed:', error);
            return false;
        }
    }

    /**
     * Log database information and statistics
     */
    private logDatabaseInfo(): void {
        if (!this.db) return;

        try {
            // Get database file size
            const stat = this.db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get() as any;
            const sizeKB = Math.round(stat.size / 1024);

            // Get table counts
            const tables = this.db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `).all();

            Logger.info('📊 Database Statistics:');
            Logger.info(`   File size: ${sizeKB} KB`);
            Logger.info(`   Tables: ${tables.length}`);
            Logger.info(`   Foreign keys: ${this.db.pragma('foreign_keys')[0].foreign_keys ? 'enabled' : 'disabled'}`);
            Logger.info(`   Journal mode: ${this.db.pragma('journal_mode')[0].journal_mode}`);

        } catch (error) {
            Logger.warn('⚠️ Could not retrieve database statistics:', error);
        }
    }

    /**
     * Get database connection
     */
    getDatabase(): Database.Database {
        if (!this.db || !this.isInitialized) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }

    /**
     * Check if database is initialized
     */
    isReady(): boolean {
        return this.isInitialized && this.db !== null;
    }

    /**
     * Execute a transaction
     */
    transaction<T>(fn: (db: Database.Database) => T): T {
        if (!this.db) throw new Error('Database not initialized');
        
        const transaction = this.db.transaction(fn);
        return transaction(this.db);
    }

    /**
     * Backup database to specified path
     */
    async backup(backupPath: string): Promise<boolean> {
        if (!this.db) return false;

        try {
            Logger.info(`💾 Creating database backup: ${backupPath}`);
            
            this.db.backup(backupPath);
            
            Logger.success('✅ Database backup created successfully');
            return true;

        } catch (error) {
            Logger.error('❌ Database backup failed:', error);
            return false;
        }
    }

    /**
     * Optimize database (VACUUM and ANALYZE)
     */
    async optimize(): Promise<boolean> {
        if (!this.db) return false;

        try {
            Logger.info('🔧 Optimizing database...');

            // VACUUM to reclaim space and defragment
            this.db.exec('VACUUM');
            
            // ANALYZE to update query planner statistics
            this.db.exec('ANALYZE');

            Logger.success('✅ Database optimization completed');
            return true;

        } catch (error) {
            Logger.error('❌ Database optimization failed:', error);
            return false;
        }
    }

    /**
     * Get database statistics
     */
    getStats(): any {
        if (!this.db) return null;

        try {
            const pageInfo = this.db.prepare('SELECT * FROM pragma_page_count(), pragma_page_size()').get() as any;
            const size = pageInfo.page_count * pageInfo.page_size;

            const tableStats = this.db.prepare(`
                SELECT 
                    name as table_name,
                    (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name=m.name) as index_count
                FROM sqlite_master m 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `).all();

            return {
                path: this.config.path,
                sizeBytes: size,
                sizeKB: Math.round(size / 1024),
                sizeMB: Math.round(size / (1024 * 1024) * 100) / 100,
                pageCount: pageInfo.page_count,
                pageSize: pageInfo.page_size,
                tables: tableStats.length,
                isInitialized: this.isInitialized,
                foreignKeysEnabled: this.db.pragma('foreign_keys')[0].foreign_keys === 1,
                journalMode: this.db.pragma('journal_mode')[0].journal_mode
            };

        } catch (error) {
            Logger.error('❌ Failed to get database stats:', error);
            return null;
        }
    }

    /**
     * Cleanup and close database connection
     */
    cleanup(): void {
        try {
            if (this.db) {
                Logger.info('🗄️ Closing database connection...');
                this.db.close();
                this.db = null;
                this.isInitialized = false;
                Logger.info('✅ Database connection closed');
            }
        } catch (error) {
            Logger.error('❌ Error closing database:', error);
        }
    }

    /**
     * Perform database health check
     */
    async healthCheck(): Promise<{
        healthy: boolean;
        checks: Record<string, boolean>;
        error?: string;
    }> {
        const checks: Record<string, boolean> = {};

        try {
            // Check if database is initialized
            checks.initialized = this.isInitialized;

            // Check if database connection is active
            checks.connected = this.db !== null;

            // Check if we can perform a simple query
            if (this.db) {
                this.db.prepare('SELECT 1').get();
                checks.queryable = true;
            } else {
                checks.queryable = false;
            }

            // Check foreign key constraints
            if (this.db) {
                checks.foreignKeys = this.db.pragma('foreign_keys')[0].foreign_keys === 1;
            } else {
                checks.foreignKeys = false;
            }

            // Check if all required tables exist
            if (this.db) {
                const tableCount = this.db.prepare(`
                    SELECT COUNT(*) as count FROM sqlite_master 
                    WHERE type='table' AND name NOT LIKE 'sqlite_%'
                `).get() as any;
                checks.tablesExist = tableCount.count >= 10; // We expect at least 10 tables
            } else {
                checks.tablesExist = false;
            }

            const healthy = Object.values(checks).every(check => check === true);

            return {
                healthy,
                checks
            };

        } catch (error) {
            return {
                healthy: false,
                checks,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}