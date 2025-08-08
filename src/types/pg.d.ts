declare module 'pg' {
  export interface PoolConfig { connectionString?: string }
  export class Pool {
    constructor(config?: PoolConfig);
    query(text: string, params?: any[]): Promise<any>;
    end(): Promise<void>;
  }
}
