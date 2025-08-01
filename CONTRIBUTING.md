# Contributing to Discord AI Chatbot

## Development Setup

1. **Prerequisites**

   - [Bun](https://bun.sh/) (latest version)
   - Discord Bot Token
   - OpenAI API Key
   - ViettelAI TTS Token

2. **Installation**

   ```bash
   git clone <repository-url>
   cd bot-discord
   bun install
   ```

3. **Environment Setup**

   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

4. **Development**
   ```bash
   bun run dev  # Start with hot reload
   bun run start  # Start production mode
   ```

## Project Structure

- `src/` - Source code
  - `commands/` - Discord slash commands
  - `events/` - Discord event handlers
  - `ai/` - AI integration logic
  - `tts/` - Text-to-speech functionality
  - `database/` - Database operations
  - `utils/` - Utility functions
- `config/` - Configuration files
- `data/` - Database files (gitignored)
- `logs/` - Log files (gitignored)

## Branching Strategy

- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

## Commit Convention

Use conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation updates
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/updates
- `chore:` - Maintenance tasks
