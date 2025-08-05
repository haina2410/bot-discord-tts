#!/bin/bash

# Discord AI Chatbot PM2 Deployment Script
# This script handles the deployment process with PM2 process management

set -e  # Exit on any error

echo "🚀 Starting PM2 deployment for Discord AI Chatbot..."

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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed!"
    echo "Please install pnpm: npm install -g pnpm"
    exit 1
fi

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    echo "⚠️ PM2 not found globally, installing..."
    npm install -g pm2
fi

echo "✅ Node.js found: $(node --version)"
echo "✅ pnpm found: $(pnpm --version)"
echo "✅ PM2 found: $(pm2 --version)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Build the application
echo "🔨 Building TypeScript application..."
pnpm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix TypeScript errors."
    exit 1
fi

echo "✅ Build completed successfully"

# Stop existing PM2 process if running
echo "🛑 Stopping existing PM2 process (if any)..."
pm2 stop discord-ai-chatbot 2>/dev/null || echo "No existing process found"

# Start with PM2
echo "🚀 Starting application with PM2..."
if [ "$NODE_ENV" = "production" ]; then
    pnpm run pm2:start:prod
else
    pnpm run pm2:start
fi

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script (optional)
if [ "$1" = "--setup-startup" ]; then
    echo "⚙️ Setting up PM2 startup script..."
    pm2 startup
    echo "Please run the command shown above as root to complete startup setup"
fi

echo "✅ PM2 deployment completed successfully!"
echo ""
echo "📊 Application Status:"
pm2 status

echo ""
echo "📋 Useful PM2 commands:"
echo "  pnpm run pm2:logs     - View logs"
echo "  pnpm run pm2:monit    - Monitor processes"
echo "  pnpm run pm2:restart  - Restart application"
echo "  pnpm run pm2:stop     - Stop application"
echo "  pnpm run pm2:status   - Check status"
echo ""
echo "🎯 Bot is now running with PM2 process management!"
echo "💡 Check logs with: pnpm run pm2:logs"