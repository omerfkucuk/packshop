FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json
RUN npm ci

COPY apps/backend apps/backend
WORKDIR /app/apps/backend
RUN npx medusa build

ENV NODE_ENV=production
EXPOSE 9000

CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]
