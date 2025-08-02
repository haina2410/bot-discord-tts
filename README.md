# Discord AI Chatbot

A sophisticated Discord bot with AI-powered conversations, persistent user context, and database-backed memory.

## Features

- 🤖 **AI-Powered Conversations** - Intelligent responses using OpenAI
- 🧠 **Persistent User Context** - Remembers user preferences and personality traits
- 💾 **Database-Backed Memory** - SQLite database for scalable data storage
- 🎯 **Interest Tracking** - Learns and adapts to user interests over time
- 📊 **Conversation Analytics** - Detailed statistics and insights
- 🔄 **CRUD Operations** - Full Create, Read, Update, Delete functionality
- 🎵 **Text-to-Speech** - Voice synthesis capabilities
- 🛡️ **Data Integrity** - Foreign key constraints and transaction support

## Prerequisites

- Node.js 20+
- pnpm (recommended package manager)
- Discord Bot Token
- OpenAI API Key

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd bot-discord
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your tokens and configuration
```

## Usage

### Development

```bash
pnpm dev
```

### Production

```bash
pnpm start
```

### Type Checking

```bash
pnpm type-check
```

### Database Testing

```bash
pnpm tsx scripts/test-database.ts
```

## Project Structure

```
src/
├── ai/                 # AI and context management
├── commands/           # Discord slash commands
├── database/           # Database operations and schema
├── events/            # Discord event handlers
├── tts/               # Text-to-speech functionality
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## Database

The bot uses SQLite with a comprehensive schema including:

- User profiles and preferences
- Interest and personality tracking
- Conversation history
- Channel contexts
- Topic management
- Active user tracking

## Docker Support

```bash
# Build and run with Docker Compose
pnpm run docker:build
pnpm run docker:run

# View logs
pnpm run docker:logs

# Stop containers
pnpm run docker:stop
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

This project uses Node.js with TypeScript and pnpm for fast, reliable package management.
