# syntax=docker/dockerfile:1
# Production image (Next.js standalone + Prisma migrate at boot)

FROM node:20-bookworm-slim AS deps
WORKDIR /app

ARG AUTH_SECRET
ENV NEXT_TELEMETRY_DISABLED=1 \
    PRISMA_SKIP_ENGINE_CHECK=1 \
    AUTH_SECRET=${AUTH_SECRET}

# Install system dependencies (openssl for Prisma, ca-certificates for HTTPS)
RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Enable pnpm and install specified version
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml* ./

# Install dependencies, skip postinstall scripts (prisma generate needs schema)
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Generate Prisma client at build stage when schema is available
RUN pnpm add -D prisma

# -----------------------------------------------------------------------------

FROM deps AS builder
WORKDIR /app

# Copy source code (including prisma/schema.prisma)
COPY . .

# Generate Prisma client (now schema is available)
RUN pnpm exec prisma generate

# Build Next.js application (standalone output)
RUN pnpm build

# -----------------------------------------------------------------------------

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Install only runtime system dependencies (openssl for Prisma at runtime)
RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Prisma CLI (needed for migrate deploy inside container)
RUN npm i -g prisma@5.22.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy standalone output from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy public directory
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Copy Prisma schema and migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
