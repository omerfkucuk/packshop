FROM node:20-alpine
WORKDIR /app

# Full monorepo, not a hand-picked set of package.json files: the backend
# now depends on the @dtc/* workspace packages (ai-composer, layout-engine,
# packaging-engine) too, and npm's workspace resolution needs every
# workspace's package.json present to link them, not just apps/backend's
# and apps/storefront's. .dockerignore keeps this from pulling in
# node_modules/.next/.turbo/.medusa/dist/build/.git.
COPY . .
RUN npm ci

# Builds packaging-engine -> layout-engine -> ai-composer first (turbo.json's
# build task has dependsOn: ["^build"]), then the backend itself - the same
# dependency-aware order Vercel's turbo build already does for the
# storefront. A plain `npx medusa build` here would fail: those packages'
# "main"/"types" point at dist/, which only exists after their own build.
# Run from the repo root, where turbo.json lives.
RUN npx turbo build --filter=@dtc/backend

WORKDIR /app/apps/backend/.medusa/server

ENV NODE_ENV=production
EXPOSE 9000

CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]
