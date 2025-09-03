FROM node:24-alpine
RUN apk add --no-cache git openssh
WORKDIR /usr/src/app

# PNPM stable + store interne à l'image
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate
RUN pnpm config set store-dir /usr/src/app/.pnpm-store

# Étape deps (cache-friendly)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile

# Prisma client (Linux) généré DANS l'image
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm --filter @cofound/api prisma:generate

# Code (pour le run/dev)
COPY . .

EXPOSE 3000
CMD ["pnpm","--filter","@cofound/api","dev"]
