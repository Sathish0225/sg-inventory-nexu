# Single image: builds the web app, then runs the API which also serves it.
FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# The server imports shared types, maths and permissions from ../src.
COPY src ./src
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci
COPY server ./server
RUN cd server && npx prisma generate
COPY --from=web /app/dist ./dist

ENV NODE_ENV=production \
    PORT=3001 \
    WEB_DIST=/app/dist \
    TZ=Asia/Singapore
EXPOSE 3001
WORKDIR /app/server
USER node
# Apply pending migrations, then start.
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/index.ts"]
