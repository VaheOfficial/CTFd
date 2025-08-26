# ---- Base ----
    FROM oven/bun:1-alpine AS base
    WORKDIR /app
    ENV NODE_ENV=development
    ENV NEXT_TELEMETRY_DISABLED=1
    
    # ---- Deps ----
    FROM base AS deps
    RUN apk add --no-cache libc6-compat
    COPY package.json bun.lockb* ./
    RUN if [ -f bun.lockb ]; then bun install --frozen-lockfile; else bun install; fi
    
    # ---- Dev ----
    FROM base AS development
    # COPY --from=deps /app/node_modules ./node_modules
    COPY . .
    EXPOSE 3000
    CMD ["sh","-c","bun install && bun run dev"]
    
    
    # ---- Production build (optional, keep if you deploy prod images) ----
    FROM base AS builder
    COPY --from=deps /app/node_modules ./node_modules
    COPY . .
    RUN bun run build
    
    FROM node:18-alpine AS production
    WORKDIR /app
    ENV NODE_ENV=production
    ENV NEXT_TELEMETRY_DISABLED=1
    RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
    COPY --from=builder /app/public ./public
    RUN mkdir .next && chown nextjs:nodejs .next
    COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
    COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
    USER nextjs
    EXPOSE 3000
    ENV PORT=3000
    ENV HOSTNAME=0.0.0.0
    CMD ["node","server.js"]
    