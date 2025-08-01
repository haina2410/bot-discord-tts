# Use the official Bun image
FROM oven/bun:1.2.12-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p data logs

# Make scripts executable
RUN chmod +x scripts/*.sh

# Run type check during build
RUN bun run tsc --noEmit

# Create non-root user for security
RUN addgroup --system --gid 1001 botuser
RUN adduser --system --uid 1001 botuser
RUN chown -R botuser:botuser /app
USER botuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ./scripts/health-check.sh

# Expose port (for potential web interface later)
EXPOSE 3000

# Start the bot
CMD ["bun", "run", "src/index.ts"]