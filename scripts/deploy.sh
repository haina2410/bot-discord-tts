#!/bin/bash

# Discord AI Chatbot Deployment Script
# This script handles deployment to production

set -e

echo "🚀 Discord AI Chatbot Deployment"
echo "================================"

# Parse command line arguments
ENVIRONMENT=${1:-production}
echo "📍 Deploying to: $ENVIRONMENT"

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install/update dependencies
echo "📦 Installing dependencies..."
bun install --frozen-lockfile

# Run type check
echo "🔍 Running type check..."
bun run type-check

# Run tests if they exist
if [ -d "tests" ] || [ -f "test.ts" ]; then
    echo "🧪 Running tests..."
    bun test
fi

# Build if needed
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🏗️  Building for production..."
    bun run build
fi

# Create backup of current deployment
if [ -f "data/bot.db" ]; then
    echo "💾 Creating database backup..."
    cp data/bot.db "data/bot-backup-$(date +%Y%m%d-%H%M%S).db"
fi

# Restart the service
echo "🔄 Restarting service..."

if command -v pm2 &> /dev/null; then
    echo "Using PM2..."
    pm2 restart discord-ai-bot || pm2 start bun --name "discord-ai-bot" -- run start
elif command -v systemctl &> /dev/null; then
    echo "Using systemctl..."
    sudo systemctl restart discord-bot
elif command -v docker-compose &> /dev/null; then
    echo "Using Docker Compose..."
    docker-compose down
    docker-compose up -d --build
else
    echo "⚠️  No process manager found. Please start the bot manually."
    echo "Run: bun run start:prod"
fi

# Wait a moment for startup
sleep 5

# Health check
echo "🏥 Running health check..."
if ./scripts/health-check.sh; then
    echo "✅ Deployment successful!"
else
    echo "❌ Deployment may have issues. Check logs."
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo "📋 Next steps:"
echo "   - Monitor logs for any issues"
echo "   - Test bot functionality in Discord"
echo "   - Check bot status with !status command"