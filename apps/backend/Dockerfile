# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json
RUN npm ci --workspace=apps/backend --include-workspace-root

COPY apps/backend apps/backend
WORKDIR /app/apps/backend
RUN npx medusa build

FROM node:20-alpine AS production
WORKDIR /app

COPY --from=build /app/apps/backend/.medusa/server ./
RUN npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 9000

CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]
