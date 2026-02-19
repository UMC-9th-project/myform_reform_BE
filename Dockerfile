# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Build
# ============================================
FROM node:23-slim AS builder

WORKDIR /app

# 의존성 파일 복사
COPY package*.json ./

# BuildKit 캐시 마운트로 npm 캐시 재사용
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Prisma 스키마 복사 및 클라이언트 생성
COPY prisma ./prisma
RUN npx prisma generate

# 소스 코드 복사 및 빌드
COPY tsconfig.json tsoa.json ./
COPY src ./src

RUN npm run build

# ============================================
# Stage 2: Production Dependencies
# ============================================
FROM node:23-slim AS prod-deps

WORKDIR /app

COPY package*.json ./

# production 의존성만 설치 (prune보다 빠름)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Prisma 클라이언트 재생성 (production용)
COPY prisma ./prisma
RUN npx prisma generate

# ============================================
# Stage 3: Production
# ============================================
FROM node:23-slim AS production

WORKDIR /app

# 보안을 위해 non-root 사용자 생성
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs nodejs

# production 의존성 복사
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package*.json ./

# 빌드된 파일 복사
COPY --from=builder /app/dist ./dist

# Swagger 문서 복사
COPY --from=builder /app/src/config/swagger.json ./dist/config/swagger.json

USER nodejs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/app.js"]
