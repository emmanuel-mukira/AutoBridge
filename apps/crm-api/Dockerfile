FROM node:22-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/apps/crm-api

FROM base AS build
COPY apps/crm-api/package.json apps/crm-api/package-lock.json ./
RUN npm ci
COPY apps/crm-api/prisma.config.ts ./
COPY apps/crm-api/prisma/automotive ./prisma/automotive
RUN npx prisma generate
COPY apps/crm-api/tsconfig.json ./
COPY apps/crm-api/src ./src
COPY apps/crm-api/data/research-evaluation-summary.json ./data/research-evaluation-summary.json
RUN npm run build

FROM build AS migrate
CMD ["npx", "prisma", "migrate", "deploy"]

FROM build AS production-deps
RUN npm prune --omit=dev

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=production-deps --chown=node:node /app/apps/crm-api/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/crm-api/dist ./dist
COPY --chown=node:node apps/crm-api/package.json ./
COPY --chown=node:node apps/crm-api/prisma/automotive/schema.prisma ./prisma/automotive/schema.prisma
COPY --chown=node:node apps/crm-api/prisma/automotive/migrations ./prisma/automotive/migrations
COPY --chown=node:node apps/crm-api/data/ibm-reliability-summary.json ./data/ibm-reliability-summary.json
COPY --chown=node:node models/automotive_v1/metadata.json /app/models/automotive_v1/metadata.json
USER node
EXPOSE 3000
CMD ["node", "dist/src/index.js"]
