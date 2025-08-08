-- PostgreSQL schema for Discord bot

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  display_name TEXT,
  interaction_count INTEGER DEFAULT 0,
  last_seen BIGINT NOT NULL,
  preferred_response_style TEXT,
  timezone TEXT,
  language TEXT,
  bio TEXT,
  goals TEXT,
  preferences TEXT,
  notes TEXT,
  interests JSONB DEFAULT '[]',
  personality JSONB DEFAULT '[]',
  recent_topics JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS channel_contexts (
  channel_id TEXT PRIMARY KEY,
  channel_name TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  conversation_tone TEXT DEFAULT 'casual',
  last_activity BIGINT NOT NULL,
  recent_topics JSONB DEFAULT '[]',
  active_users JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS server_profiles (
  server_id TEXT PRIMARY KEY,
  server_name TEXT NOT NULL,
  owner_id TEXT,
  member_count INTEGER DEFAULT 0,
  last_activity BIGINT NOT NULL,
  recent_events JSONB DEFAULT '[]',
  ignoring_channels JSONB DEFAULT '[]',
  listening_channels JSONB DEFAULT '[]',
  command_prefix TEXT DEFAULT '!'
);

CREATE TABLE IF NOT EXISTS conversation_history (
  id SERIAL PRIMARY KEY,
  channel_id TEXT NOT NULL,
  user_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  author TEXT,
  relevance_score REAL DEFAULT 0
);
