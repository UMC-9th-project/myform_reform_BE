# ============================================
# Stage 1: Build
# ============================================
FROM node:23-alpine AS builder

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY package*.json ./
RUN npm ci

# Prisma 스키마 복사 및 클라이언트 생성
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsoa.json ./
COPY src ./src
COPY @types ./@types

# RUN node -v && npm -v && npx tsc -v

# TypeScript 빌드 (tsoa 라우트 생성 + tsc 컴파일)
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:23-alpine AS production

WORKDIR /app

# 보안을 위해 non-root 사용자 생성
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 프로덕션 의존성만 설치
COPY package*.json ./
RUN npm ci
# RUN npm ci --only=production && npm cache clean --force

# Prisma 스키마 복사 및 클라이언트 생성
COPY prisma ./prisma
RUN npx prisma generate

# 빌드된 파일 복사
COPY --from=builder /app/dist ./dist

# Swagger 문서 복사 (tsoa가 생성)
COPY --from=builder /app/src/config/swagger.json ./dist/config/swagger.json

# 소유권 변경
RUN chown -R nodejs:nodejs /app

# non-root 사용자로 전환
USER nodejs

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=3001

# 포트 노출
EXPOSE 3001

# 애플리케이션 실행
CMD ["node", "dist/app.js"]
