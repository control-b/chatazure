# Dockerfile for Y.js WebSocket Service
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Builder stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm install -g pnpm
RUN pnpm build

# Runner stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 yjs

# Copy built application
COPY --from=builder --chown=yjs:nodejs /app/dist ./dist
COPY --from=builder --chown=yjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=yjs:nodejs /app/package.json ./package.json

USER yjs

EXPOSE 4001

ENV PORT 4001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4001/health || exit 1

CMD ["node", "dist/server.js"]
