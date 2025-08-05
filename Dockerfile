# Multi-stage build for Discord AI Chatbot
FROM node:22-slim AS base

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Stage for production dependencies
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

# Stage for development dependencies and building
FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source code and configuration
COPY . .

# Build the TypeScript code
RUN pnpm run build

# Final runtime stage
FROM node:22-slim AS runtime

# Install system dependencies for runtime
RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy built application and necessary files
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json

# Create necessary directories with proper permissions
RUN mkdir -p data logs

# Make scripts executable
RUN chmod +x scripts/*.sh

# Create non-root user for security
RUN groupadd --system --gid 1001 botuser && \
    useradd --system --uid 1001 --gid botuser --home /app --shell /bin/bash botuser

# Change ownership of app directory
RUN chown -R botuser:botuser /app

# Switch to non-root user
USER botuser

# Set production environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ./scripts/health-check.sh || exit 1

# Expose port if your bot serves HTTP (optional)
# EXPOSE 3000

CMD ["pnpm", "start"]