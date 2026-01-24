import prisma from '../../config/prisma.config.js';
import { owner } from '@prisma/client';

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
