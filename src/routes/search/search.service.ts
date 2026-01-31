import { esClient } from '../../config/elasticsearch.js';
import prisma from '../../config/prisma.config.js';
import { CursorUtil } from '../../utils/cursorUtil.js';
import { SearchResDTO, SearchListResDTO } from './search.res.dto.js';
import type { target_type_enum } from '@prisma/client';
import { Role } from '../auth/auth.dto.js';

type UserTargetType = Exclude<target_type_enum, 'REQUEST'>;
type SearchCursor = [number, number, string]; // [score, createdAt, id]
const PAGE_SIZE = 15;

export class SearchService {
  public async search(
    type: target_type_enum,
    query: string,
    userId: string,
    role: Role,
    cursor?: string
  ): Promise<SearchListResDTO> {
    const searchAfter = CursorUtil.decode<SearchCursor>(cursor);

    // Elasticsearch 쿼리 실행
    const esResponse = await esClient.search<Record<string, any>>({
      index: 'search_integration',
      size: PAGE_SIZE + 1,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['title^2', 'content'], // title에 가중치 부여
                fuzziness: 'AUTO' // 오타 허용
              }
            }
          ],
          filter: [{ term: { type: type.toUpperCase() } }]
        }
      },
      sort: [
        // 정렬 기준 (관련도 > 최신순 > ID)
        { _score: { order: 'desc' } },
        { createdAt: { order: 'desc' } },
        { id: { order: 'asc' } }
      ],
      ...(searchAfter && { search_after: searchAfter })
    });

    // 검색 결과 파싱
    const { hits: hitsContainer } = esResponse;
    const hits = hitsContainer.hits || [];
    const totalCount =
      typeof hitsContainer.total === 'object'
        ? hitsContainer.total.value
        : hitsContainer.total || 0;

    const hasNextPage = hits.length > PAGE_SIZE;
    const currentHits = hasNextPage ? hits.slice(0, PAGE_SIZE) : hits;

    // _source 추출
    const results = currentHits.map((hit) => hit._source || {});
    const resultIds = results.map((item: any) => item.id).filter(Boolean);

    // DB에서 찜 여부(isLiked)확인 및 결합
    const isLikedSet = await this.getIsLikedSet(userId, type, resultIds, role);

    const finalResults = results.map((item: any) => ({
      ...item,
      isLiked: isLikedSet.has(item.id)
    }));

    // 다음 페이지 커서 생성
    const lastHit = currentHits[currentHits.length - 1];
    const nextCursor =
      hasNextPage && lastHit?.sort
        ? CursorUtil.encode<SearchCursor>(lastHit.sort as SearchCursor)
        : null;

    return {
      results: finalResults as SearchResDTO[],
      nextCursor,
      hasNextPage,
      totalCount: Number(totalCount)
    };
  }

  private async getIsLikedSet(
    userId: string,
    type: target_type_enum,
    resultIds: string[],
    role: Role
  ): Promise<Set<string>> {
    const isLikedSet = new Set<string>();
    if (!userId || resultIds.length === 0) return isLikedSet;

    if (role === 'user') {
      const wishes = await prisma.user_wish.findMany({
        where: {
          user_id: userId,
          target_type: type as UserTargetType,
          target_id: { in: resultIds }
        },
        select: { target_id: true }
      });
      wishes.forEach((w) => w.target_id && isLikedSet.add(w.target_id));
    } else {
      const owner = await prisma.owner.findUnique({
        where: { owner_id: userId },
        select: { owner_id: true }
      });
      if (owner && type === 'REQUEST') {
        const wishes = await prisma.owner_wish.findMany({
          where: { owner_id: userId, reform_request_id: { in: resultIds } },
          select: { reform_request_id: true }
        });
        wishes.forEach((w) => isLikedSet.add(w.reform_request_id));
      }
    }
    return isLikedSet;
  }
}
