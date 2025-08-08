import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Logger } from '../utils/logger.js';
import { config } from '../config/bot.js';

export interface DatabaseConfig {
  connectionString: string;
}

export class DatabaseManager {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private ready = false;

  constructor(databaseConfig?: Partial<DatabaseConfig>) {
    this.config = {
      connectionString: databaseConfig?.connectionString || config.databaseUrl,
    };
  }

  async initialize(): Promise<boolean> {
    try {
      Logger.info('🗄️ Connecting to PostgreSQL database...');
      this.pool = new Pool({ connectionString: this.config.connectionString });
      await this.pool.query('SELECT 1');
      await this.setupSchema();
      this.ready = true;
      Logger.success('✅ Database connection established');
      return true;
    } catch (error) {
      Logger.error('❌ Database initialization failed:', error);
      this.pool = null;
      return false;
    }
  }

  private async setupSchema(): Promise<void> {
    if (!this.pool) throw new Error('Database not connected');
    const schemaPath = join(process.cwd(), 'src', 'database', 'schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf-8');
    const statements = schemaSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await this.pool.query(stmt);
    }
  }

  getDatabase(): Pool {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }
    return this.pool;
  }

  isReady(): boolean {
    return this.ready;
  }

  async getStats(): Promise<any> {
    if (!this.pool) return null;
    const result = await this.pool.query(
      `SELECT
         (SELECT COUNT(*) FROM user_profiles) AS users,
         (SELECT COUNT(*) FROM channel_contexts) AS channels,
         (SELECT COUNT(*) FROM server_profiles) AS servers,
         (SELECT COUNT(*) FROM conversation_history) AS messages`
    );
    return result.rows[0];
  }

  async cleanup(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.ready = false;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; checks: Record<string, boolean>; error?: string }> {
    const checks: Record<string, boolean> = {};
    try {
      checks.connected = !!this.pool;
      if (this.pool) {
        await this.pool.query('SELECT 1');
        checks.queryable = true;
      } else {
        checks.queryable = false;
      }
      const healthy = Object.values(checks).every((c) => c);
      return { healthy, checks };
    } catch (error) {
      return { healthy: false, checks, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
