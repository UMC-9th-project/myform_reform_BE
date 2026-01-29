#!/bin/bash

SSH_HOST=${SSH_HOST:-develop_user}
DB_TUNNEL_PORT=${DB_TUNNEL_PORT:-54312}
REMOTE_DB_PORT=${REMOTE_DB_PORT:-54312}  
REDIS_DB_PORT=${REDIS_DB_PORT:-63790}
REMOTE_REDIS_PORT=${REMOTE_REDIS_PORT:-63790}
ELASTIC_DB_PORT=${ELASTIC_DB_PORT:-9200}
REMOTE_ELASTIC_PORT=${REMOTE_ELASTIC_PORT:-9200}

if [ -f .env.local ]; then
  echo "ℹ️ Loading .env.local"
  export $(cat .env.local | grep -v '^#' | tr -d '\r' | xargs)
fi

check_port() {
  netstat -ano | grep "LISTENING" | grep ":$1" > /dev/null 2>&1
}

if check_port ${DB_TUNNEL_PORT}; then
  echo "✅ SSH tunnel already open on localhost:${DB_TUNNEL_PORT}"
  exit 0
fi

echo "🔌 Opening SSH tunnels via ${SSH_HOST}..."

# DB 터널
echo "  - DB: localhost:${DB_TUNNEL_PORT} -> ${REMOTE_DB_PORT}"
ssh -fN -L ${DB_TUNNEL_PORT}:localhost:${REMOTE_DB_PORT} ${SSH_HOST}

# Redis 터널
echo "  - Redis: localhost:${REDIS_DB_PORT} -> ${REMOTE_REDIS_PORT}"
ssh -fN -L ${REDIS_DB_PORT}:localhost:${REMOTE_REDIS_PORT} ${SSH_HOST}

# Elastic 터널
echo "  - Elastic: localhost:${ELASTIC_DB_PORT} -> ${REMOTE_ELASTIC_PORT}"
ssh -fN -L ${ELASTIC_DB_PORT}:localhost:${REMOTE_ELASTIC_PORT} ${SSH_HOST}

sleep 2
if check_port ${DB_TUNNEL_PORT}; then
  echo "✅ All tunnels opened successfully"
else
  echo "❌ Failed to open tunnel. Please check your SSH config or network."
  exit 1
fi