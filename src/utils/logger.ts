export class Logger {
    private static formatTime(): string {
        return new Date().toISOString();
    }

    private static sanitize(message: string): string {
        return message.replace(/^[\u{1F300}-\u{1FAFF}]\s*/u, '');
    }

    private static format(level: string, message: string): string {
        return `[${this.formatTime()}] ${level} ${this.sanitize(message)}`;
    }

    static info(message: string, data?: any) {
        console.log(this.format('INFO', message), data ?? '');
    }

    static success(message: string, data?: any) {
        console.log(this.format('SUCCESS', message), data ?? '');
    }

    static warn(message: string, data?: any) {
        console.warn(this.format('WARN', message), data ?? '');
    }

    static error(message: string, error?: any) {
        console.error(this.format('ERROR', message), error ?? '');
    }

    static debug(message: string, data?: any) {
        if (process.env.NODE_ENV === 'development') {
            console.log(this.format('DEBUG', message), data ?? '');
        }
    }
}

