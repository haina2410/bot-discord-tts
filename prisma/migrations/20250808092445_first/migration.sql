-- CreateTable
CREATE TABLE "public"."user_profiles" (
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT,
    "interaction_count" INTEGER NOT NULL DEFAULT 0,
    "last_seen" BIGINT NOT NULL,
    "preferred_response_style" TEXT,
    "timezone" TEXT,
    "language" TEXT,
    "bio" TEXT,
    "goals" TEXT,
    "preferences" TEXT,
    "notes" TEXT,
    "interests" JSONB NOT NULL DEFAULT '[]',
    "personality" JSONB NOT NULL DEFAULT '[]',
    "recent_topics" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."channel_contexts" (
    "channel_id" TEXT NOT NULL,
    "channel_name" TEXT NOT NULL,
    "channel_type" TEXT NOT NULL,
    "conversation_tone" TEXT NOT NULL DEFAULT 'casual',
    "last_activity" BIGINT NOT NULL,
    "recent_topics" JSONB NOT NULL DEFAULT '[]',
    "active_users" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "channel_contexts_pkey" PRIMARY KEY ("channel_id")
);

-- CreateTable
CREATE TABLE "public"."server_profiles" (
    "server_id" TEXT NOT NULL,
    "server_name" TEXT NOT NULL,
    "owner_id" TEXT,
    "member_count" INTEGER DEFAULT 0,
    "last_activity" BIGINT NOT NULL,
    "recent_events" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "server_profiles_pkey" PRIMARY KEY ("server_id")
);

-- CreateTable
CREATE TABLE "public"."conversation_history" (
    "id" SERIAL NOT NULL,
    "channel_id" TEXT NOT NULL,
    "user_id" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "author" TEXT,
    "relevance_score" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "conversation_history_pkey" PRIMARY KEY ("id")
);
