-- Discord Bot User Database Schema
-- SQLite Database Design for User Profiles and Channel Contexts
-- Created: 2025-08-02
-- Version: 1.0

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- =============================================================================
-- USER PROFILES TABLE
-- =============================================================================
-- Stores comprehensive user profile information based on Discord interactions
CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,              -- Discord user ID (snowflake)
    username TEXT NOT NULL,                    -- Discord username
    display_name TEXT,                         -- Discord display name
    interaction_count INTEGER DEFAULT 0,       -- Total interactions with bot
    last_seen INTEGER NOT NULL,                -- Unix timestamp of last interaction
    preferred_response_style TEXT CHECK(preferred_response_style IN ('casual', 'formal', 'friendly', 'technical')),
    timezone TEXT,                             -- User's timezone (e.g., 'America/New_York')
    language TEXT,                             -- User's preferred language (e.g., 'en', 'vi')
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Index for fast user lookups by Discord ID
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen ON user_profiles(last_seen);

-- =============================================================================
-- USER INTERESTS TABLE
-- =============================================================================
-- Stores user interests as separate records for flexible querying
CREATE TABLE IF NOT EXISTS user_interests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,                     -- References user_profiles.user_id
    interest TEXT NOT NULL,                    -- Interest topic/keyword
    weight REAL DEFAULT 1.0,                   -- Interest strength/relevance
    first_mentioned INTEGER DEFAULT (strftime('%s', 'now')),
    last_mentioned INTEGER DEFAULT (strftime('%s', 'now')),
    mention_count INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON user_interests(interest);

-- =============================================================================
-- USER PERSONALITY TRAITS TABLE
-- =============================================================================
-- Stores personality traits identified from user interactions
CREATE TABLE IF NOT EXISTS user_personality_traits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,                     -- References user_profiles.user_id
    trait TEXT NOT NULL,                       -- Personality trait (e.g., 'humorous', 'technical')
    confidence REAL DEFAULT 0.5,               -- Confidence in trait identification (0.0-1.0)
    first_observed INTEGER DEFAULT (strftime('%s', 'now')),
    last_observed INTEGER DEFAULT (strftime('%s', 'now')),
    observation_count INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_personality_user_id ON user_personality_traits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_personality_trait ON user_personality_traits(trait);

-- =============================================================================
-- USER RECENT TOPICS TABLE
-- =============================================================================
-- Stores recent conversation topics for context building
CREATE TABLE IF NOT EXISTS user_recent_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,                     -- References user_profiles.user_id
    topic TEXT NOT NULL,                       -- Topic/keyword
    relevance REAL DEFAULT 1.0,                -- Topic relevance score
    mentioned_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_recent_topics_user_id ON user_recent_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recent_topics_mentioned_at ON user_recent_topics(mentioned_at);

-- =============================================================================
-- CHANNEL CONTEXTS TABLE
-- =============================================================================
-- Stores channel-specific context information
CREATE TABLE IF NOT EXISTS channel_contexts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL UNIQUE,           -- Discord channel ID (snowflake)
    channel_name TEXT NOT NULL,                -- Discord channel name
    channel_type TEXT NOT NULL,                -- Channel type (text, voice, etc.)
    conversation_tone TEXT CHECK(conversation_tone IN ('casual', 'serious', 'technical', 'fun')) DEFAULT 'casual',
    last_activity INTEGER NOT NULL,            -- Unix timestamp of last activity
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_channel_contexts_channel_id ON channel_contexts(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_contexts_last_activity ON channel_contexts(last_activity);

-- =============================================================================
-- CHANNEL RECENT TOPICS TABLE
-- =============================================================================
-- Stores recent topics discussed in channels
CREATE TABLE IF NOT EXISTS channel_recent_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,                  -- References channel_contexts.channel_id
    topic TEXT NOT NULL,                       -- Topic/keyword
    relevance REAL DEFAULT 1.0,                -- Topic relevance score
    mentioned_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (channel_id) REFERENCES channel_contexts(channel_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_channel_recent_topics_channel_id ON channel_recent_topics(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_recent_topics_mentioned_at ON channel_recent_topics(mentioned_at);

-- =============================================================================
-- CHANNEL ACTIVE USERS TABLE
-- =============================================================================
-- Tracks active users in channels for context building
CREATE TABLE IF NOT EXISTS channel_active_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,                  -- References channel_contexts.channel_id
    user_id TEXT NOT NULL,                     -- References user_profiles.user_id
    last_active INTEGER DEFAULT (strftime('%s', 'now')),
    activity_count INTEGER DEFAULT 1,
    FOREIGN KEY (channel_id) REFERENCES channel_contexts(channel_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_active_users_channel_id ON channel_active_users(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_active_users_user_id ON channel_active_users(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_active_users_last_active ON channel_active_users(last_active);

-- =============================================================================
-- CONVERSATION HISTORY TABLE
-- =============================================================================
-- Stores conversation messages for context and learning
CREATE TABLE IF NOT EXISTS conversation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,                  -- References channel_contexts.channel_id
    user_id TEXT,                              -- References user_profiles.user_id (NULL for bot messages)
    role TEXT CHECK(role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,                     -- Message content
    timestamp INTEGER NOT NULL,                -- Unix timestamp
    author TEXT,                               -- Author name for reference
    relevance_score REAL DEFAULT 0.0,          -- Message relevance score
    FOREIGN KEY (channel_id) REFERENCES channel_contexts(channel_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_conversation_history_channel_id ON conversation_history(channel_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_user_id ON conversation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_timestamp ON conversation_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversation_history_role ON conversation_history(role);

-- =============================================================================
-- MESSAGE TOPICS TABLE
-- =============================================================================
-- Stores topics extracted from conversation messages
CREATE TABLE IF NOT EXISTS message_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,          -- References conversation_history.id
    topic TEXT NOT NULL,                       -- Extracted topic/keyword
    confidence REAL DEFAULT 0.5,               -- Topic extraction confidence
    FOREIGN KEY (conversation_id) REFERENCES conversation_history(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_topics_conversation_id ON message_topics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_topics_topic ON message_topics(topic);

-- =============================================================================
-- DATABASE METADATA TABLE
-- =============================================================================
-- Stores database version and migration information
CREATE TABLE IF NOT EXISTS database_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Insert initial metadata
INSERT OR REPLACE INTO database_metadata (key, value) VALUES ('schema_version', '1.0');
INSERT OR REPLACE INTO database_metadata (key, value) VALUES ('created_at', strftime('%s', 'now'));

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =============================================================================

-- Update user_profiles.updated_at on changes
CREATE TRIGGER IF NOT EXISTS update_user_profiles_timestamp 
    AFTER UPDATE ON user_profiles
BEGIN
    UPDATE user_profiles SET updated_at = strftime('%s', 'now') WHERE user_id = NEW.user_id;
END;

-- Update channel_contexts.updated_at on changes
CREATE TRIGGER IF NOT EXISTS update_channel_contexts_timestamp 
    AFTER UPDATE ON channel_contexts
BEGIN
    UPDATE channel_contexts SET updated_at = strftime('%s', 'now') WHERE channel_id = NEW.channel_id;
END;

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- Complete user profile view with aggregated data
CREATE VIEW IF NOT EXISTS user_profiles_complete AS
SELECT 
    up.user_id,
    up.username,
    up.display_name,
    up.interaction_count,
    up.last_seen,
    up.preferred_response_style,
    up.timezone,
    up.language,
    up.created_at,
    up.updated_at,
    GROUP_CONCAT(DISTINCT ui.interest) as interests,
    GROUP_CONCAT(DISTINCT upt.trait) as personality_traits,
    GROUP_CONCAT(DISTINCT urt.topic) as recent_topics
FROM user_profiles up
LEFT JOIN user_interests ui ON up.user_id = ui.user_id
LEFT JOIN user_personality_traits upt ON up.user_id = upt.user_id
LEFT JOIN user_recent_topics urt ON up.user_id = urt.user_id AND urt.mentioned_at > (strftime('%s', 'now') - 86400)
GROUP BY up.user_id;

-- Complete channel context view with aggregated data
CREATE VIEW IF NOT EXISTS channel_contexts_complete AS
SELECT 
    cc.channel_id,
    cc.channel_name,
    cc.channel_type,
    cc.conversation_tone,
    cc.last_activity,
    cc.created_at,
    cc.updated_at,
    GROUP_CONCAT(DISTINCT crt.topic) as recent_topics,
    GROUP_CONCAT(DISTINCT cau.user_id) as active_users
FROM channel_contexts cc
LEFT JOIN channel_recent_topics crt ON cc.channel_id = crt.channel_id AND crt.mentioned_at > (strftime('%s', 'now') - 86400)
LEFT JOIN channel_active_users cau ON cc.channel_id = cau.channel_id AND cau.last_active > (strftime('%s', 'now') - 3600)
GROUP BY cc.channel_id;

-- =============================================================================
-- CLEANUP PROCEDURES (Implemented as queries for SQLite)
-- =============================================================================

-- Note: These are example cleanup queries that should be run periodically
-- to maintain database performance and remove old data

/*
-- Clean up old conversation history (older than 30 days)
DELETE FROM conversation_history 
WHERE timestamp < (strftime('%s', 'now') - 2592000);

-- Clean up old recent topics (older than 7 days)
DELETE FROM user_recent_topics 
WHERE mentioned_at < (strftime('%s', 'now') - 604800);

DELETE FROM channel_recent_topics 
WHERE mentioned_at < (strftime('%s', 'now') - 604800);

-- Clean up inactive channel users (inactive for 24 hours)
DELETE FROM channel_active_users 
WHERE last_active < (strftime('%s', 'now') - 86400);

-- Update database metadata
UPDATE database_metadata 
SET value = strftime('%s', 'now'), updated_at = strftime('%s', 'now') 
WHERE key = 'last_cleanup';
*/