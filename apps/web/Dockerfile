FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @dealer/web...
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @dealer/shared build && pnpm --filter @dealer/web build

FROM node:22-alpine
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
