export class Logger {
    private static formatTime(): string {
        return new Date().toISOString();
    }

    static info(message: string, data?: any) {
        console.log(`[${this.formatTime()}] ℹ️  ${message}`, data ? data : '');
    }

    static success(message: string, data?: any) {
        console.log(`[${this.formatTime()}] ✅ ${message}`, data ? data : '');
    }

    static warn(message: string, data?: any) {
        console.warn(`[${this.formatTime()}] ⚠️  ${message}`, data ? data : '');
    }

    static error(message: string, error?: any) {
        console.error(`[${this.formatTime()}] ❌ ${message}`, error ? error : '');
    }

    static debug(message: string, data?: any) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${this.formatTime()}] 🐛 ${message}`, data ? data : '');
        }
    }
}