module.exports = {
  apps: [
    {
      name: 'discord-ai-chatbot',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Process management
      kill_timeout: 3000,
      listen_timeout: 3000,
      
      // Advanced features
      source_map_support: true,
      instance_var: 'INSTANCE_ID',
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: '0 3 * * *',
      
      // Environment-specific overrides
      node_args: '--max-old-space-size=1024'
    }
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/bot-discord.git',
      path: '/var/www/discord-bot',
      'pre-deploy-local': '',
      'post-deploy': 'pnpm install && pnpm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};