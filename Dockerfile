FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
# Install tsx globally and run type check during build
RUN pnpm add -g tsx
RUN pnpm run type-check

FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist

# Create necessary directories
RUN mkdir -p data logs

# Make scripts executable
RUN chmod +x scripts/*.sh

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
CMD ["pnpm", "start"]