FROM oven/bun:1.1 AS base
WORKDIR /usr/src/app

# Step 1: Install dependencies into a temp directory to leverage caching
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY packages/server/package.json /temp/dev/packages/server/
COPY packages/database/package.json /temp/dev/packages/database/
COPY packages/shared/package.json /temp/dev/packages/shared/
COPY packages/cli/package.json /temp/dev/packages/cli/

RUN cd /temp/dev && bun install --frozen-lockfile --ignore-scripts

# Step 2: Copy dependencies and all workspace source code
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Generate Prisma Client (requires database schema copied in Step 2)
WORKDIR /usr/src/app/packages/database
RUN bunx prisma generate

# Step 3: Minimal production release stage using the built-in non-root 'bun' user
FROM base AS release
COPY --from=prerelease /usr/src/app /usr/src/app

# Run as non-root user for cloud security
USER bun

EXPOSE 3000
ENV NODE_ENV=production

WORKDIR /usr/src/app/packages/server
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
