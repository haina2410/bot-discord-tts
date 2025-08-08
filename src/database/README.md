# Database

This project uses **PostgreSQL** accessed through **Prisma** for storing bot state.

## Setup

1. Set the `DATABASE_URL` environment variable pointing to your PostgreSQL instance.
2. Apply the schema with:
   ```bash
   pnpm exec prisma migrate deploy
   ```
3. Generate the Prisma client:
   ```bash
   pnpm exec prisma generate
   ```

## Schema

The Prisma schema is defined in [`prisma/schema.prisma`](../../prisma/schema.prisma) and includes:

- `UserProfile` – user preferences and metadata.
- `ChannelContext` – channel specific settings and activity.
- `ServerProfile` – per-server information and recent events.
- `ConversationHistory` – recent messages used for AI context.

Many fields such as interests, personality traits, topics and events are stored as JSON arrays for flexibility.
