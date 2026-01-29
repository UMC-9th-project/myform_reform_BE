# ============================================
# Stage 1: Dependencies (캐시 최적화)
# ============================================
FROM node:23-alpine AS deps

WORKDIR /app

# 의존성 파일만 먼저 복사 (레이어 캐시 활용)
COPY package*.json ./

# 전체 의존성 설치 (빌드용)
RUN npm ci

# ============================================
# Stage 2: Build
# ============================================
FROM node:23-alpine AS builder

WORKDIR /app

# deps 스테이지에서 node_modules 복사
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Prisma 스키마 복사 및 클라이언트 생성
COPY prisma ./prisma
RUN npx prisma generate

# 소스 코드 복사 및 빌드
COPY tsconfig.json tsoa.json ./
COPY src ./src

RUN npm run build

# 빌드 후 devDependencies 제거 (production용)
RUN npm prune --omit=dev

# ============================================
# Stage 3: Production
# ============================================
FROM node:23-alpine AS production

WORKDIR /app

# 보안을 위해 non-root 사용자 생성
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# builder에서 정리된 node_modules 복사 (npm ci 재실행 불필요!)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# 빌드된 파일 복사
COPY --from=builder /app/dist ./dist

# Swagger 문서 복사
COPY --from=builder /app/src/config/swagger.json ./dist/config/swagger.json

# 소유권 변경
RUN chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/app.js"]
