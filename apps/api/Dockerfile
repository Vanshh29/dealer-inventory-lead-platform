FROM node:22-alpine AS build
RUN apk add --no-cache openssl && corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @dealer/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @dealer/shared build && pnpm --filter @dealer/api build

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /repo/apps/api
ENV NODE_ENV=production
COPY --from=build /repo /repo
EXPOSE 4000
# Apply committed migrations, then start. Seeding is a separate, explicit step (see README).
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
