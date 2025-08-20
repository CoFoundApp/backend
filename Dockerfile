FROM node:24-alpine

WORKDIR /usr/src/app
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

# Manifests pour installation rapide (monorepo)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json

RUN pnpm install --frozen-lockfile

# Code
COPY . .

EXPOSE 3000
CMD ["pnpm","--filter","@cofound/api","dev"]
