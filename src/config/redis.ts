import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Redis 연결 옵션 설정 (BullMQ와 공유)
export const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null
};

// Redis 클라이언트 인스턴스 생성
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  password: process.env.REDIS_PASSWORD
});

// 연결 에러 및 성공 로깅
redisClient.on('error', (err) =>
  console.error('🔴 [Infrastructure] Redis Connection Error:', err, err)
);
redisClient.on('connect', () =>
  console.log('🟢 [Infrastructure] Redis Connection Success')
);

// 실제 연결 시도
await redisClient.connect();

export { redisClient };
