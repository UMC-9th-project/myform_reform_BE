import { Worker, Job } from 'bullmq';
import { redisClient } from '../config/redis.js';
import { esClient } from '../config/elasticsearch.js';
import prisma from '../config/prisma.config.js';
import { SearchSyncJob, SEARCH_SYNC_QUEUE } from './search.queue.js';
import { migrationService } from '../routes/search/migration.service.js';

const INDEX_NAME = 'search_integration';

export const searchWorker = new Worker<SearchSyncJob>(
  SEARCH_SYNC_QUEUE,
  async (job: Job<SearchSyncJob>) => {
    const { type, id, action } = job.data;
    const esId = `${type}_${id}`;

    console.log(`[Worker] 처리 중: ${action} - ${esId}`);

    // DELETE
    if (action === 'DELETE') {
      await esClient.delete({ index: INDEX_NAME, id: esId }, { ignore: [404] });
      return;
    }

    // UPSERT
    const key = type.toLowerCase();
    const model = (prisma as any)[
      key === 'proposal'
        ? 'reform_proposal'
        : key === 'request'
          ? 'reform_request'
          : 'item'
    ];

    const includeMap: any = {
      item: { item_photo: { take: 1 }, owner: true },
      proposal: { reform_proposal_photo: { take: 1 }, owner: true },
      request: { reform_request_photo: { take: 1 }, user: true }
    };

    const pkFieldMap: any = {
      item: 'item_id',
      proposal: 'reform_proposal_id',
      request: 'reform_request_id'
    };

    const record = await model.findUnique({
      where: { [pkFieldMap[key]]: id },
      include: includeMap[key]
    });

    if (!record) {
      console.warn(`[Worker] 데이터를 찾을 수 없음: ${esId}`);
      return;
    }

    const normalized = { ...record, id: record[pkFieldMap[key]] };
    const document = migrationService.buildDocument(type, normalized);

    // Elasticsearch에 색인
    await esClient.index({
      index: INDEX_NAME,
      id: esId,
      document,
      refresh: true // 실시간 검색에 반영
    });
  },
  { connection: redisClient.options as any }
);

searchWorker.on('completed', (job) => console.log(`✅ Job ${job.id} 완료`));
searchWorker.on('failed', (job, err) =>
  console.error(`❌ Job ${job?.id} 실패:`, err)
);
