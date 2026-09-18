# Build stage
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++ openssl
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate --schema prisma/schema.prod.prisma
RUN npm run build
RUN npx tsc prisma/seed.ts --outDir prisma-dist --module commonjs --target es2022 --esModuleInterop --skipLibCheck --moduleResolution node
RUN npm prune --omit=dev

# Production stage
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma-dist ./prisma-dist
COPY --from=builder /app/package.json ./
COPY prisma ./prisma
COPY docker-entrypoint.sh ./

EXPOSE 3001
CMD ["sh", "docker-entrypoint.sh"]
