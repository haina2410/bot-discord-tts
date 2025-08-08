import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger.js';
import { config } from '../config/bot.js';

export interface DatabaseConfig {
  connectionString: string;
}

export class DatabaseManager {
  private prisma: PrismaClient | null = null;
  private config: DatabaseConfig;
  private ready = false;

  constructor(databaseConfig?: Partial<DatabaseConfig>) {
    this.config = {
      connectionString: databaseConfig?.connectionString || config.databaseUrl,
    };
  }

  async initialize(): Promise<boolean> {
    try {
      Logger.info('🗄️ Connecting to PostgreSQL database via Prisma...');
      this.prisma = new PrismaClient();
      await this.prisma.$connect();
      await this.setupSchema();
      this.ready = true;
      Logger.success('✅ Database connection established');
      return true;
    } catch (error) {
      Logger.error('❌ Database initialization failed:', error);
      this.prisma = null;
      return false;
    }
  }

  private async setupSchema(): Promise<void> {
    if (!this.prisma) throw new Error('Database not connected');
    const schemaPath = join(process.cwd(), 'src', 'database', 'schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf-8');
    const statements = schemaSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await this.prisma.$executeRawUnsafe(stmt);
    }
  }

  getDatabase(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database not initialized');
    }
    return this.prisma;
  }

  isReady(): boolean {
    return this.ready;
  }

  async getStats(): Promise<any> {
    if (!this.prisma) return null;
    const [users, channels, servers, messages] = await Promise.all([
      this.prisma.userProfile.count(),
      this.prisma.channelContext.count(),
      this.prisma.serverProfile.count(),
      this.prisma.conversationHistory.count(),
    ]);
    return { users, channels, servers, messages };
  }

  async cleanup(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
      this.ready = false;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; checks: Record<string, boolean>; error?: string }> {
    const checks: Record<string, boolean> = {};
    try {
      checks.connected = !!this.prisma;
      if (this.prisma) {
        await this.prisma.userProfile.count();
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
