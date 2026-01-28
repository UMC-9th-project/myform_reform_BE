import prisma from '../../config/prisma.config.js';
import { owner, Prisma } from '@prisma/client';
import { ReformerSummaryDTO, FeedPhotoDTO } from './dto/reformer.res.dto.js';
import { ReformerSortOption } from './dto/reformer.req.dto.js';

export type ReformerSearchResult = Omit<owner, 'search_vector'> & {
  rank: number;
};

export type NameCursor = [string, string]; // [nickname, owner_id]
export type RatingCursor = [number | string, string]; // [avg_star, owner_id]
export type TradeCursor = [number, string]; // [trade_count, owner_id]

export type ReformerCursorParts = NameCursor | RatingCursor | TradeCursor;

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

export type ReformerListResult = {
  owner_id: string;
  nickname: string | null;
  keywords: string[];
  bio: string | null;
  profile_photo: string | null;
  avg_star: Prisma.Decimal | null;
  review_count: number | null;
  trade_count: number | null;
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
    cursor?: string,
    limit: number = 9
  ): Promise<ReformerSearchResult[]> {
    const formattedKeyword = this.formatSearchKeyword(keyword);
    if (!formattedKeyword) return [];

    return await prisma.$queryRaw<ReformerSearchResult[]>`
      SELECT 
        owner_id, nickname, keywords, bio, profile_photo, 
        avg_star, review_count, trade_count,
        ts_rank(search_vector, to_tsquery('simple', ${formattedKeyword})) AS rank
      FROM "owner"
      WHERE 
        search_vector @@ to_tsquery('simple', ${formattedKeyword})
        AND (
          ${cursor}::text IS NULL OR 
          (
            ts_rank(search_vector, to_tsquery('simple', ${formattedKeyword})), 
            COALESCE(avg_star, 0), 
            owner_id::text
          ) < (
            SPLIT_PART(${cursor}, '_', 1)::float4, 
            SPLIT_PART(${cursor}, '_', 2)::numeric, 
            SPLIT_PART(${cursor}, '_', 3)
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
  ): Promise<ReformerListResult[]> {
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
      const lastId = parts ? (parts[1] as string) : undefined;

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
    const lastTrades = parts ? Number(parts[0]) : undefined;
    const lastId = parts ? (parts[1] as string) : undefined;

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
}
