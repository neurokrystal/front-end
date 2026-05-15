# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:22-slim AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY libs/shared/package.json libs/shared/

RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build
# ============================================
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/libs/shared/node_modules ./libs/shared/node_modules

COPY libs/shared ./libs/shared
COPY apps/web ./apps/web
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy root tsconfig for workspace TypeScript references
COPY tsconfig.base.json ./

# Build shared first, then web
RUN pnpm --filter @dimensional/shared build

# Next.js needs environment variables at build time for static pages
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm --filter web build

# ============================================
# Stage 3: Production image
# ============================================
FROM node:22-slim AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy Next.js standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

RUN groupadd -r dimensional && useradd -r -g dimensional dimensional
RUN chown -R dimensional:dimensional /app
USER dimensional

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:3000').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "apps/web/server.js"]
