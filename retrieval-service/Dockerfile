FROM oven/bun:1.3-alpine

WORKDIR /app

# Dependencies first (better layer caching).
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Application source.
COPY src ./src

# Bun respects the container's interpretation of NODE_ENV, but we
# set it here so any downstream lib that checks it picks up prod.
ENV NODE_ENV=production

EXPOSE 8787

CMD ["bun", "run", "src/server.ts"]
