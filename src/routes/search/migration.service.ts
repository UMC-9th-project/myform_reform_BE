import { esClient } from '../../config/elasticsearch.js';
import prisma from '../../config/prisma.config.js';

type ModelDelegate<T> = {
  count: () => Promise<number>;
  findMany: (args: any) => Promise<T[]>;
};

type RecordLike = Record<string, any>;

const INDEX_NAME = 'search_integration';
const PK_MAP: Record<string, string> = {
  item: 'item_id',
  proposal: 'reform_proposal_id',
  request: 'reform_request_id'
};

const INCLUDE_MAP: Record<string, () => any> = {
  item: () => ({ ['item_photo']: { take: 1 }, owner: true }),
  proposal: () => ({ ['reform_proposal_photo']: { take: 1 }, owner: true }),
  request: () => ({ ['reform_request_photo']: { take: 1 }, user: true })
};

function normalizeDoc(doc: RecordLike, pkField: string) {
  return { ...doc, id: String(doc[pkField] ?? doc.id) };
}

async function fetchBatch<T extends RecordLike>(
  model: ModelDelegate<T>,
  pkField: string,
  lastId: string | null,
  batchSize: number,
  include: any
) {
  return await model.findMany({
    ...(lastId ? { cursor: { [pkField]: lastId }, skip: 1 } : {}),
    orderBy: { [pkField]: 'asc' },
    take: batchSize,
    include
  });
}

async function bulkIndex(operations: any[]) {
  try {
    const raw = await esClient.bulk({ refresh: true, operations });
    const body = raw;
    if ((body as any)?.errors) {
      ((body as any).items || []).forEach((item: any) => {
        const action = item.index || item.create || item.update || item.delete;
        if (action?.error) {
          console.error('Bulk item failed:', action.error, 'id:', action._id);
        }
      });
    }
  } catch (err) {
    throw err;
  }
}

export const migrationService = {
  async syncAllToES() {
    const BATCH_SIZE = 100;

    console.log('🚀 데이터 마이그레이션 시작...');

    // 각 도메인별 마이그레이션 실행
    await this.migrateDomain('ITEM', prisma.item, BATCH_SIZE);
    await this.migrateDomain('PROPOSAL', prisma.reform_proposal, BATCH_SIZE);
    await this.migrateDomain('REQUEST', prisma.reform_request, BATCH_SIZE);

    console.log('✅ 모든 데이터 동기화 완료!');
  },

  buildDocument(type: string, doc: RecordLike) {
    const base = {
      id: doc.id,
      type,
      title: doc.title || null,
      content: doc.content || null,
      imageUrl:
        doc.item_photo?.[0]?.content ??
        doc.reform_proposal_photo?.[0]?.content ??
        doc.reform_request_photo?.[0]?.content ??
        null,
      avgStar: doc.avg_star ? parseFloat(doc.avg_star) : 0,
      reviewCount: doc.review_count ?? 0,
      authorName: doc.user?.nickname ?? doc.owner?.nickname ?? 'Unknown',
      createdAt: doc.created_at ? new Date(doc.created_at).toISOString() : null
    };
    if (type === 'REQUEST') {
      return {
        ...base,
        price: Number(doc.min_budget) || 0,
        minPrice: Number(doc.min_budget) || 0,
        maxPrice: Number(doc.max_budget) || 0
      };
    } else {
      const p = Number(doc.price) || 0;
      return {
        ...base,
        price: p,
        minPrice: p,
        maxPrice: p
      };
    }
  },

  async migrateDomain(
    type: string,
    model: ModelDelegate<RecordLike>,
    batchSize = 100
  ) {
    console.log(`📦 [${type}] 동기화 시작...`);

    let lastId: string | null = null;
    const total = await model.count();
    let processed = 0;

    const key = String(type).toLowerCase();
    const pkField = PK_MAP[key] ?? 'id';
    const include = (INCLUDE_MAP[key] ?? (() => ({})))();

    while (processed < total) {
      const records: RecordLike[] = await fetchBatch(
        model,
        pkField,
        lastId,
        batchSize,
        include
      );
      if (!records.length) break;

      const operations = records.flatMap((doc: RecordLike) => {
        const normalized = normalizeDoc(doc, pkField);
        return [
          {
            index: {
              ['_index']: INDEX_NAME,
              ['_id']: `${type}_${normalized.id}`
            }
          },
          this.buildDocument(type, normalized)
        ];
      });

      try {
        await bulkIndex(operations);
      } catch (err) {
        console.error(
          'Bulk request failed for batch starting at id',
          lastId,
          err
        );
      }

      processed += records.length;
      lastId = String(
        records[records.length - 1][pkField] ?? records[records.length - 1].id
      );
      console.log(`   -> ${processed}/${total}개 처리 완료...`);
    }
  }
};
