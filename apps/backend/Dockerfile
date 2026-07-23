FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npx medusa build

FROM node:20-alpine AS production
WORKDIR /app

COPY --from=build /app/.medusa/server ./
RUN npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 9000

CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]
