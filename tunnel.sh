#!/bin/bash

SSH_HOST=${SSH_HOST:-develop_user}
DB_TUNNEL_PORT=${DB_TUNNEL_PORT:-54312}
REMOTE_DB_PORT=${REMOTE_DB_PORT:-54312}  
REDIS_DB_PORT=${REDIS_DB_PORT:-63790}
REMOTE_REDIS_PORT=${REMOTE_REDIS_PORT:-63790}


# 환경변수 로드
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# 터널 확인
if lsof -ti:${DB_TUNNEL_PORT} > /dev/null 2>&1; then
  echo "✅ SSH tunnel already open on localhost:${DB_TUNNEL_PORT}"
  exit 0
fi

# 터널 열기
echo "🔌 Opening SSH tunnel: localhost:${DB_TUNNEL_PORT} -> ${SSH_HOST}:${REMOTE_DB_PORT}"
ssh -fN -L ${DB_TUNNEL_PORT}:localhost:${REMOTE_DB_PORT} ${SSH_HOST}
# 터널 열기
echo "🔌 Opening SSH tunnel: localhost:${REDIS_DB_PORT} -> ${SSH_HOST}:${REMOTE_REDIS_PORT}"
ssh -fN -L ${REDIS_DB_PORT}:localhost:${REMOTE_REDIS_PORT} ${SSH_HOST}

# 확인
sleep 1
if lsof -ti:${DB_TUNNEL_PORT} > /dev/null 2>&1; then
  echo "✅ Tunnel opened successfully"
else
  echo "❌ Failed to open tunnel"
  exit 1
fi