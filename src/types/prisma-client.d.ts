declare module '@prisma/client' {
  export class PrismaClient {
    constructor(options?: any);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $executeRaw(...args: any[]): Promise<any>;
    $executeRawUnsafe(query: string, ...values: any[]): Promise<any>;
    $queryRaw(...args: any[]): Promise<any>;
    $transaction(...args: any[]): Promise<any>;
    [key: string]: any;
  }
}
