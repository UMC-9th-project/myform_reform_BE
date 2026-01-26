import prisma from '../../config/prisma.config.js';
import { owner, Prisma } from '@prisma/client';
import { ReformerSummaryDTO, FeedPhotoDTO } from './reformer.dto.js';

export type ReformerSearchResult = Omit<owner, 'search_vector'> & {
  rank: number;
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
      select: {
        owner_id: true,
        nickname: true,
        keywords: true,
        bio: true,
        profile_photo: true,
        avg_star: true,
        review_count: true,
        trade_count: true
      }
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
}
