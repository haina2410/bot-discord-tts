# Discord Bot Database Schema

## Overview

This database schema is designed to store and manage user profiles and channel contexts for a Discord bot with AI capabilities. The schema uses SQLite with `better-sqlite3` for optimal performance with the Bun runtime.

## Design Principles

### 1. **Normalization & Performance Balance**

- User data is normalized to reduce redundancy while maintaining query performance
- Arrays (interests, personality traits, topics) are stored in separate tables for flexible querying
- Strategic denormalization in views for common read operations

### 2. **Scalability Considerations**

- Indexed columns for fast lookups by Discord IDs
- Efficient storage of time-series data (topics, conversation history)
- Automatic cleanup strategies for maintaining performance

### 3. **Data Integrity**

- Foreign key constraints ensure referential integrity
- Check constraints for enum-like fields
- Automatic timestamp management with triggers

## Core Tables

### User Profiles (`user_profiles`)

**Purpose**: Store core Discord user information and preferences

```sql
user_id          -- Discord user ID (primary identifier)
username         -- Discord username
display_name     -- Discord display name
interaction_count -- Total bot interactions
last_seen        -- Last interaction timestamp
preferred_response_style -- AI response preference
timezone         -- User timezone
language         -- Preferred language
```

**Related Tables**:

- `user_interests` - User interests/topics of interest
- `user_personality_traits` - AI-identified personality traits
- `user_recent_topics` - Recently discussed topics

### Channel Contexts (`channel_contexts`)

**Purpose**: Store channel-specific context and conversation state

```sql
channel_id       -- Discord channel ID (primary identifier)
channel_name     -- Discord channel name
channel_type     -- Channel type (text, voice, etc.)
conversation_tone -- Current conversation tone
last_activity    -- Last activity timestamp
```

**Related Tables**:

- `channel_recent_topics` - Recently discussed topics in channel
- `channel_active_users` - Currently active users in channel

### Conversation History (`conversation_history`)

**Purpose**: Store message history for AI context building

```sql
channel_id       -- Which channel the message was in
user_id          -- Who sent the message (NULL for bot)
role             -- 'user' or 'assistant'
content          -- Message content
timestamp        -- When the message was sent
relevance_score  -- AI-calculated relevance
```

## Interface Mapping

The database schema directly maps to TypeScript interfaces:

### UserProfile Interface → Database Tables

```typescript
interface UserProfile {
  userId: string; // user_profiles.user_id
  username: string; // user_profiles.username
  displayName?: string; // user_profiles.display_name
  interests: string[]; // user_interests table
  personality: string[]; // user_personality_traits table
  recentTopics: string[]; // user_recent_topics table
  interactionCount: number; // user_profiles.interaction_count
  lastSeen: number; // user_profiles.last_seen
  preferredResponseStyle?: string; // user_profiles.preferred_response_style
  timezone?: string; // user_profiles.timezone
  language?: string; // user_profiles.language
}
```

### ChannelContext Interface → Database Tables

```typescript
interface ChannelContext {
  channelId: string; // channel_contexts.channel_id
  channelName: string; // channel_contexts.channel_name
  channelType: string; // channel_contexts.channel_type
  recentTopics: string[]; // channel_recent_topics table
  activeUsers: string[]; // channel_active_users table
  conversationTone: string; // channel_contexts.conversation_tone
  lastActivity: number; // channel_contexts.last_activity
}
```

## Performance Optimizations

### Indexes

- **Primary Keys**: Auto-indexed for unique identification
- **Discord IDs**: Fast lookups for user_id and channel_id
- **Timestamps**: Efficient time-based queries and cleanup
- **Foreign Keys**: Optimized joins between related tables

### Views

- **`user_profiles_complete`**: Aggregated user data for quick retrieval
- **`channel_contexts_complete`**: Aggregated channel data with active context

### Data Retention

- **Recent Topics**: Automatically filtered to last 24 hours in views
- **Active Users**: Automatically filtered to last hour in views
- **Conversation History**: Designed for periodic cleanup of old messages

## Migration Strategy

### Version 1.0 (Initial)

- Core table structure
- Basic indexes and constraints
- Initial views and triggers

### Future Versions

- Schema migrations will be handled through versioned SQL files
- `database_metadata` table tracks current schema version
- Backward-compatible changes preferred

## Usage Patterns

### High-Frequency Operations

1. **User Profile Lookup**: `SELECT * FROM user_profiles_complete WHERE user_id = ?`
2. **Channel Context Retrieval**: `SELECT * FROM channel_contexts_complete WHERE channel_id = ?`
3. **Recent Conversation History**: `SELECT * FROM conversation_history WHERE channel_id = ? ORDER BY timestamp DESC LIMIT 20`

### Batch Operations

1. **Topic Updates**: Bulk insert/update recent topics
2. **Activity Tracking**: Update user activity and channel participation
3. **Cleanup Operations**: Periodic removal of old data

## Maintenance

### Regular Cleanup (Recommended Schedule)

- **Daily**: Clean up old recent topics (>7 days)
- **Weekly**: Clean up old conversation history (>30 days)
- **Hourly**: Clean up inactive channel users (>24 hours)

### Monitoring

- Track database file size growth
- Monitor query performance on indexed columns
- Watch for foreign key constraint violations

## Security Considerations

### Data Protection

- Discord IDs are stored as TEXT to handle large snowflake values
- No sensitive personal information stored beyond Discord public data
- Foreign key cascades ensure data consistency

### Privacy

- User data can be completely removed via CASCADE DELETE
- Conversation history can be selectively cleaned
- No permanent storage of message content beyond operational needs

## Development Notes

### Testing

- Use in-memory SQLite (`:memory:`) for unit tests
- Seed test data for consistent development environment
- Validate schema migrations with test data

### Backup Strategy

- SQLite file-based backup (simple file copy)
- Export to SQL format for cross-platform compatibility
- Regular automated backups in production environment
