#!/bin/bash

# Discord AI Chatbot Health Check Script
# This script checks if the bot is running properly

echo "🏥 Discord AI Chatbot Health Check"
echo "=================================="

# Check if bot process is running
BOT_PID=$(pgrep -f "bun.*src/index.ts" | head -1)

if [ -z "$BOT_PID" ]; then
    echo "❌ Bot process not found"
    echo "Status: OFFLINE"
    exit 1
else
    echo "✅ Bot process running (PID: $BOT_PID)"
fi

# Check memory usage
MEMORY_MB=$(ps -p $BOT_PID -o rss= | awk '{print int($1/1024)}')
echo "💾 Memory usage: ${MEMORY_MB}MB"

if [ $MEMORY_MB -gt 500 ]; then
    echo "⚠️  High memory usage detected"
fi

# Check if log file exists and get recent errors
LOG_FILE="logs/bot.log"
if [ -f "$LOG_FILE" ]; then
    ERROR_COUNT=$(tail -100 "$LOG_FILE" | grep -c "ERROR\|❌" || echo "0")
    echo "📋 Recent errors in last 100 log lines: $ERROR_COUNT"
    
    if [ $ERROR_COUNT -gt 5 ]; then
        echo "⚠️  High error rate detected"
    fi
else
    echo "📋 No log file found"
fi

# Check disk space
DISK_USAGE=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
echo "💽 Disk usage: ${DISK_USAGE}%"

if [ $DISK_USAGE -gt 85 ]; then
    echo "⚠️  High disk usage detected"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file missing"
    exit 1
else
    echo "✅ Configuration file present"
fi

# Overall status
echo "=================================="
if [ $MEMORY_MB -lt 500 ] && [ $ERROR_COUNT -lt 5 ] && [ $DISK_USAGE -lt 85 ]; then
    echo "🎉 Status: HEALTHY"
    exit 0
else
    echo "⚠️  Status: WARNING - Check issues above"
    exit 2
fi