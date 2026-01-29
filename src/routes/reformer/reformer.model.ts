import prisma from '../../config/prisma.config.js';
import { owner, Prisma } from '@prisma/client';
import { ReformerSummaryDTO, FeedPhotoDTO } from './dto/reformer.res.dto.js';
import { ReformerSortOption } from './dto/reformer.req.dto.js';

export type ReformerSearchResult = Omit<owner, 'search_vector'> & {
  rank: number;
};

export type NameCursor = [string, string]; // [nickname, owner_id]
export type RatingCursor = [number, string]; // [avg_star, owner_id]
export type TradeCursor = [number, string]; // [trade_count, owner_id]
export type SearchCursor = [number, number, string]; // [rank, avg_star, owner_id]
export type FeedCursor = [string]; // [feed_id]

export type ReformerCursorParts = NameCursor | RatingCursor | TradeCursor;

type FeedRow = {
  feed_id: string;
  created_at: Date;
  photo_content: string | null;
  photo_count: bigint;
};

const REFORMER_SELECT: Prisma.ownerSelect = {
  owner_id: true,
  nickname: true,
  keywords: true,
  bio: true,
  profile_photo: true,
  avg_star: true,
  review_count: true,
  trade_count: true
};

export class ReformerModel {
  private formatSearchKeyword(keyword: string): string {
    const trimmed = keyword.trim();
    if (!trimmed) return '';

    const tokens = trimmed
      .split(/\s+/)
      .map((word) => {
        const escaped = word.replace(/['"&|!():*<>@^~\\]/g, '').trim();
        if (!escaped) return '';
        return escaped.length > 1 ? `${escaped}:*` : escaped;
      })
      .filter(Boolean);

    if (tokens.length === 0) return '';
    return tokens.join(' & ');
  }

  public async findTopByReviewCount(
    limit: number = 3
  ): Promise<ReformerSummaryDTO[]> {
    const rows = await prisma.owner.findMany({
      take: limit,
      orderBy: [
        { review_count: 'desc' },
        { avg_star: 'desc' },
        { owner_id: 'desc' }
      ],
      select: REFORMER_SELECT
    });

    return rows.map((r) => ({
      owner_id: r.owner_id,
      nickname: r.nickname ?? '',
      keywords: r.keywords ?? [],
      bio: r.bio ?? '',
      profile_photo: r.profile_photo ?? '',
      avg_star: r.avg_star ? Number(r.avg_star) : 0,
      review_count: r.review_count ?? 0,
      trade_count: r.trade_count ?? 0
    }));
  }

  public async findRecentDistinctFeedPhotos(
    limit: number = 4
  ): Promise<FeedPhotoDTO[]> {
    const photos = await prisma.feed_photo.findMany({
      where: { photo_order: 1 },
      distinct: ['feed_id'],
      orderBy: [{ created_at: 'desc' }, { feed_id: 'desc' }],
      take: limit,
      select: {
        feed_id: true,
        content: true
      }
    });

    return photos.map((p) => ({
      feed_id: p.feed_id,
      content: p.content ?? null
    }));
  }

  public async findByKeywordWithWeight(
    keyword: string,
    cursor?: SearchCursor,
    limit: number = 9
  ): Promise<ReformerSearchResult[]> {
    const formattedKeyword = this.formatSearchKeyword(keyword);
    if (!formattedKeyword) return [];

    const cursorString = cursor ? cursor.join('_') : null;

    return await prisma.$queryRaw<ReformerSearchResult[]>`
      SELECT 
        owner_id, nickname, keywords, bio, profile_photo, 
        avg_star, review_count, trade_count,
        ts_rank(search_vector, to_tsquery('simple', ${formattedKeyword})) AS rank
      FROM "owner"
      WHERE 
        search_vector @@ to_tsquery('simple', ${formattedKeyword})
        AND (
          ${cursorString}::text IS NULL OR 
          (
            ts_rank(search_vector, to_tsquery('simple', ${formattedKeyword})), 
            COALESCE(avg_star, 0), 
            owner_id::text
          ) < (
            SPLIT_PART(${cursorString}, '_', 1)::float4, 
            SPLIT_PART(${cursorString}, '_', 2)::numeric, 
            SPLIT_PART(${cursorString}, '_', 3)
          )
        )
      ORDER BY rank DESC, avg_star DESC NULLS LAST, owner_id DESC
      LIMIT ${limit + 1}::int;
    `;
  }

  public async countByKeyword(keyword: string): Promise<number> {
    const formattedKeyword = this.formatSearchKeyword(keyword);
    if (!formattedKeyword) return 0;

    const result = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) FROM "owner" 
      WHERE search_vector @@ to_tsquery('simple', ${formattedKeyword})
    `;
    return Number(result[0].count);
  }

  public async findAllWithSort(
    sort: ReformerSortOption,
    cursorParts?: ReformerCursorParts,
    limit: number = 15
  ) {
    if (sort === 'name') {
      const parts = cursorParts as NameCursor | undefined;
      const where: Prisma.ownerWhereInput = {
        nickname: { not: null },
        ...(parts && {
          OR: [
            { nickname: { gt: parts[0] } },
            { AND: [{ nickname: parts[0] }, { owner_id: { gt: parts[1] } }] }
          ]
        })
      };

      return await prisma.owner.findMany({
        where,
        orderBy: [{ nickname: 'asc' }, { owner_id: 'asc' }],
        take: limit + 1,
        select: REFORMER_SELECT
      });
    }

    if (sort === 'rating') {
      const parts = cursorParts as RatingCursor | undefined;
      const lastAvg = parts ? new Prisma.Decimal(parts[0]) : undefined;
      const lastId = parts ? parts[1] : undefined;

      const where: Prisma.ownerWhereInput = {
        avg_star: { not: null },
        ...(parts && {
          OR: [
            { avg_star: { lt: lastAvg } },
            { AND: [{ avg_star: lastAvg }, { owner_id: { lt: lastId } }] }
          ]
        })
      };

      return await prisma.owner.findMany({
        where,
        orderBy: [{ avg_star: 'desc' }, { owner_id: 'desc' }],
        take: limit + 1,
        select: REFORMER_SELECT
      });
    }

    const parts = cursorParts as TradeCursor | undefined;
    const lastTrades = parts ? parts[0] : undefined;
    const lastId = parts ? parts[1] : undefined;

    const where: Prisma.ownerWhereInput = {
      trade_count: { not: null },
      ...(parts && {
        OR: [
          { trade_count: { lt: lastTrades } },
          { AND: [{ trade_count: lastTrades }, { owner_id: { lt: lastId } }] }
        ]
      })
    };

    return await prisma.owner.findMany({
      where,
      orderBy: [{ trade_count: 'desc' }, { owner_id: 'desc' }],
      take: limit + 1,
      select: REFORMER_SELECT
    });
  }

  public async countAll(): Promise<number> {
    const count = await prisma.owner.count();
    return count;
  }

  // 전체 피드 탐색
  public async findFeeds(cursor?: FeedCursor, limit: number = 20) {
    const cursorFeedId = cursor?.[0];

    // Raw SQL로 마이크로초 정밀도 유지 (최신순 정렬)
    const feeds = await prisma.$queryRaw<FeedRow[]>`
      SELECT 
        f.feed_id,
        f.created_at,
        (
          SELECT fp.content 
          FROM feed_photo fp 
          WHERE fp.feed_id = f.feed_id AND fp.photo_order = 1 
          LIMIT 1
        ) as photo_content,
        (
          SELECT COUNT(*) 
          FROM feed_photo fp 
          WHERE fp.feed_id = f.feed_id
        ) as photo_count
      FROM feed f
      WHERE (
        ${cursorFeedId}::uuid IS NULL 
        OR (f.created_at, f.feed_id) < (
          (SELECT created_at FROM feed WHERE feed_id = ${cursorFeedId}::uuid),
          ${cursorFeedId}::uuid
        )
      )
      ORDER BY f.created_at DESC, f.feed_id DESC
      LIMIT ${limit + 1}
    `;

    return feeds.map((row) => ({
      feed_id: row.feed_id,
      created_at: row.created_at,
      feed_photo: row.photo_content ? [{ content: row.photo_content }] : [],
      _count: { feed_photo: Number(row.photo_count) }
    }));
  }

  // 피드 내 전체 사진 조회
  public async findFeedPhotos(feedId: string) {
    return await prisma.feed_photo.findMany({
      where: {
        feed_id: feedId
      },
      orderBy: {
        photo_order: 'asc'
      },
      select: {
        photo_order: true,
        content: true
      }
    });
  }
}
