import { Events } from 'discord.js';
import { Logger } from '../utils/logger.js';

export default {
    name: Events.Error,
    execute(error: Error) {
        Logger.error('🚨 Discord client error:', error.message);
        
        // Log additional error details
        Logger.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack?.substring(0, 500), // Truncate stack trace
        });
        
        // TODO: Implement error logging to file or external service
        // TODO: Send error notifications to admin users
    },
};