FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @dealer/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @dealer/shared build && pnpm --filter @dealer/api build

FROM node:22-alpine
RUN corepack enable
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo ./
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
