import { Queue } from 'bullmq';
import { redisOptions } from '../config/redis.js';

export const SEARCH_SYNC_QUEUE = 'search-sync-queue';

// Job 데이터 타입 정의
export interface SearchSyncJob {
  type: 'ITEM' | 'PROPOSAL' | 'REQUEST';
  id: string;
  action: 'UPSERT' | 'DELETE';
}

// Redis 큐 생성
export const searchSyncQueue = new Queue<SearchSyncJob>(SEARCH_SYNC_QUEUE, {
  connection: redisOptions
});

// Producer 유틸 함수
export const addSearchSyncJob = async (data: SearchSyncJob) => {
  await searchSyncQueue.add(`${data.type}_${data.id}_${Date.now()}`, data, {
    attempts: 3, // 실패 시 재시도
    backoff: { type: 'exponential', delay: 1000 } // 재시도 간격
  });
};
