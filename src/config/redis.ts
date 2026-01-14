import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`,
  password: process.env.REDIS_PASSWORD,
  // 재시도 횟수를 제한하거나 간격을 조정해서 로그 폭탄을 방지할 수 있습니다.
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) return false; // 10번만 시도하고 포기 (나중에 필요할 때 다시 연결)
      return 5000; // 5초마다 재시도
    }
  }
});

// 에러 핸들러: 로그를 한 줄로 줄여서 '무시'하기 편하게 만듭니다.
redisClient.on('error', (err) => {
  // console.error 전체를 출력하지 않고 메시지만 짧게 출력
  console.log('🟡 [Infrastructure] Redis is offline. (Waiting for connection...)');
});

redisClient.on('connect', () => console.log('🟢 [Infrastructure] Redis Connection Success'));

// 실제 연결 시도 - 실패해도 무시하고 진행
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    // 여기서 에러를 잡아주면 앱이 죽지 않습니다.
    console.log('⚠️ Redis connection failed. App will run without Redis caching.');
  }
})();

export { redisClient };