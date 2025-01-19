# Use Node.js 20 Alpine as the base image
FROM mirror.gcr.io/library/node:22-alpine AS base

RUN apk add --no-cache curl

# ----------------------
# Install dependencies
# ----------------------

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
FROM base AS deps
RUN apk add --no-cache libc6-compat git
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# ----------------------
# Build stage
# ----------------------

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm && pnpm run build

# ----------------------
# Prepare the runtime environment
# ----------------------

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 remix

# Set the correct permission for prerender cache
RUN mkdir build
RUN chown remix:nodejs build

COPY --from=builder --chown=remix:nodejs /app/build .
COPY --from=builder --chown=remix:nodejs /app/public .
COPY --from=builder --chown=remix:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=remix:nodejs /app/LICENSE .

USER remix
EXPOSE 3000


HEALTHCHECK --interval=5s --timeout=10s --start-period=10s --retries=3 CMD [ "curl", "-f", "http://localhost:3000/" ]

CMD ./node_modules/.bin/remix-serve build/server/index.js