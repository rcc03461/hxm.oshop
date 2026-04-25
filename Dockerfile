FROM node:22-bookworm-slim AS base
WORKDIR /app

# 先安裝依賴以提升快取命中率
COPY package.json package-lock.json ./
RUN npm ci

# 複製完整專案並建置 Nuxt 產物
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# 保留 migration 所需腳本與設定；服務啟動只依賴 .output
COPY --from=base /app/.output ./.output
COPY --from=base /app/server ./server
COPY --from=base /app/scripts ./scripts
COPY --from=base /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=base /app/server/database/migrations ./server/database/migrations
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/package-lock.json ./package-lock.json

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
