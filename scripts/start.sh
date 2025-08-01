#!/bin/bash

# Discord AI Chatbot Start Script
# This script handles the startup process with proper error handling

set -e  # Exit on any error

echo "🚀 Starting Discord AI Chatbot..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure your tokens."
    exit 1
fi

# Check if required environment variables are set
check_env_var() {
    if [ -z "${!1}" ]; then
        echo "❌ Error: $1 environment variable is not set!"
        return 1
    fi
}

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check required variables
echo "🔍 Checking environment variables..."
check_env_var "DISCORD_TOKEN" || exit 1
check_env_var "DISCORD_CLIENT_ID" || exit 1

echo "✅ Environment variables verified"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p data
mkdir -p logs

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Error: Bun is not installed!"
    echo "Please install Bun from https://bun.sh/"
    exit 1
fi

echo "✅ Bun found: $(bun --version)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    bun install
fi

# Run type check
echo "🔍 Running type check..."
bun run tsc --noEmit

if [ $? -ne 0 ]; then
    echo "❌ Type check failed! Please fix TypeScript errors."
    exit 1
fi

echo "✅ Type check passed"

# Start the bot
echo "🤖 Starting Discord AI Chatbot..."
echo "Press Ctrl+C to stop the bot"
echo "----------------------------------------"

# Use exec to replace the shell process with the bot process
exec bun run src/index.ts