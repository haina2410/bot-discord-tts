// Database module exports
export { DatabaseManager } from './databaseManager.js';
export type { DatabaseConfig } from './databaseManager.js';

// CRUD Operations exports
export { DatabaseCRUD } from './operations.js';
export type { DatabaseOperations, ConversationMessage } from './operations.js';

// Re-export interfaces from contextManager for consistency
export type { UserProfile, ChannelContext } from '../ai/contextManager.js';