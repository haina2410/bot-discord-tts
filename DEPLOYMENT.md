# Discord AI Chatbot Deployment Guide

## Development Deployment (Local Testing)

### Prerequisites

- Completed Discord bot setup (see SETUP_DISCORD.md)
- Environment variables configured in `.env`
- All dependencies installed with `bun install`

### Local Development Deployment

1. **Environment Setup**

   ```bash
   # Copy and configure environment variables
   cp .env.example .env
   # Edit .env with your actual tokens and IDs
   ```

2. **Start Development Server**

   ```bash
   # Development mode with hot reload
   bun run dev

   # Or production mode
   bun run start
   ```

3. **Verify Deployment**
   - Bot should appear online in Discord server
   - Check console for successful connection logs
   - Test with `!test` command in configured channel
   - Verify with `!status` command for bot information

## Production Deployment Options

### Option 1: VPS/Dedicated Server

**Recommended for: Full control, custom configurations**

1. **Server Setup**

   ```bash
   # Install Bun on Ubuntu/Debian
   curl -fsSL https://bun.sh/install | bash

   # Clone repository
   git clone <your-repo-url>
   cd bot-discord

   # Install dependencies
   bun install

   # Configure environment
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Process Management (PM2)**

   ```bash
   # Install PM2
   npm install -g pm2

   # Start bot with PM2
   pm2 start bun --name "discord-ai-bot" -- run start

   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

3. **System Service (Alternative)**

   ```bash
   # Create systemd service
   sudo nano /etc/systemd/system/discord-bot.service
   ```

   ```ini
   [Unit]
   Description=Discord AI Chatbot
   After=network.target

   [Service]
   Type=simple
   User=your-user
   WorkingDirectory=/path/to/bot-discord
   ExecStart=/home/your-user/.bun/bin/bun run start
   Restart=always
   RestartSec=10
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   # Enable and start service
   sudo systemctl enable discord-bot
   sudo systemctl start discord-bot
   ```

### Option 2: Railway

**Recommended for: Easy deployment, automatic scaling**

1. **Prepare for Railway**

   ```bash
   # Create Procfile
   echo "web: bun run start" > Procfile
   ```

2. **Deploy to Railway**
   - Connect GitHub repository to Railway
   - Set environment variables in Railway dashboard
   - Deploy automatically on git push

### Option 3: Heroku

**Note: Heroku requires Dockerfile for Bun**

1. **Create Dockerfile**

   ```dockerfile
   FROM oven/bun:1.2.12

   WORKDIR /app

   COPY package.json bun.lock ./
   RUN bun install --frozen-lockfile

   COPY . .

   EXPOSE 3000

   CMD ["bun", "run", "start"]
   ```

2. **Deploy to Heroku**

   ```bash
   # Login to Heroku
   heroku login

   # Create app
   heroku create your-discord-bot

   # Set environment variables
   heroku config:set DISCORD_TOKEN=your_token
   heroku config:set OPENAI_API_KEY=your_key
   # ... other environment variables

   # Deploy
   git push heroku main
   ```

### Option 4: DigitalOcean App Platform

**Recommended for: Managed deployment, easy scaling**

1. **App Spec Configuration**
   ```yaml
   name: discord-ai-bot
   services:
     - name: bot
       source_dir: /
       github:
         repo: your-username/bot-discord
         branch: main
       run_command: bun run start
       environment_slug: node-js
       instance_count: 1
       instance_size_slug: basic-xxs
       envs:
         - key: DISCORD_TOKEN
           value: your_token
           type: SECRET
         - key: OPENAI_API_KEY
           value: your_key
           type: SECRET
   ```

## Environment Variables for Production

```env
# Discord Configuration
DISCORD_TOKEN=your_production_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id

# Channels
LISTEN_CHANNEL_ID=your_channel_id
VOICE_CHANNEL_ID=your_voice_channel_id

# AI Services
OPENAI_API_KEY=your_openai_key

# TTS Service
VIETTEL_TTS_TOKEN=your_tts_token

# Database
DATABASE_PATH=./data/bot.db

# Production Settings
NODE_ENV=production
LOG_LEVEL=info
```

## Monitoring and Logging

### Log Management

```bash
# View logs with PM2
pm2 logs discord-ai-bot

# View logs with systemd
sudo journalctl -u discord-bot -f

# Log rotation
sudo logrotate /etc/logrotate.d/discord-bot
```

### Health Monitoring

- Monitor bot status with `!status` command
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Monitor memory usage and restart if needed
- Set up Discord webhook notifications for errors

## Security Considerations

1. **Environment Variables**

   - Never commit `.env` to version control
   - Use secure environment variable management
   - Rotate tokens regularly

2. **Server Security**

   - Keep system updated
   - Use firewall rules
   - Limit SSH access
   - Regular security audits

3. **Bot Permissions**
   - Use minimal required permissions
   - Review bot permissions regularly
   - Monitor bot activity logs

## Troubleshooting

### Common Issues

1. **Bot Offline**

   - Check Discord token validity
   - Verify internet connection
   - Check process status

2. **Commands Not Working**

   - Verify bot permissions in Discord
   - Check channel configuration
   - Review error logs

3. **Memory Issues**

   - Monitor memory usage
   - Implement log rotation
   - Consider server upgrade

4. **Database Issues**
   - Check file permissions
   - Verify disk space
   - Backup database regularly

### Debug Mode

```bash
# Enable debug logging
NODE_ENV=development bun run start

# Or set log level
LOG_LEVEL=debug bun run start
```

## Backup and Recovery

1. **Database Backup**

   ```bash
   # Backup SQLite database
   cp data/bot.db backups/bot-$(date +%Y%m%d).db
   ```

2. **Configuration Backup**

   ```bash
   # Backup configuration (without secrets)
   cp config/bot.ts backups/
   ```

3. **Automated Backups**
   ```bash
   # Add to crontab
   0 2 * * * /path/to/backup-script.sh
   ```

## Performance Optimization

1. **Memory Management**

   - Monitor heap usage
   - Implement garbage collection tuning
   - Use memory profiling tools

2. **Database Optimization**

   - Regular VACUUM operations
   - Index optimization
   - Query performance monitoring

3. **Network Optimization**
   - Connection pooling
   - Rate limit handling
   - Retry mechanisms

---

**Next Steps After Deployment:**

1. Test all bot functionality
2. Monitor performance and logs
3. Set up automated backups
4. Configure monitoring alerts
5. Document operational procedures
