import {
  ReformerSearchReqDTO,
  ReformerSearchResDTO,
  ReformerSummaryDTO,
  ReformerHomeResDTO,
  FeedPhotoDTO
} from './reformer.dto.js';
import { ReformerModel } from './reformer.model.js';
import { ReformerSearchResult } from './reformer.model.js';

export class ReformerService {
  private reformerModel = new ReformerModel();

  public async searchReformers(
    dto: ReformerSearchReqDTO
  ): Promise<ReformerSearchResDTO> {
    const { keyword, cursor } = dto;
    const limit = 9;
    const searchKeyword = keyword!.trim();

    // Decode base64 cursor
    const decodedCursor = cursor
      ? Buffer.from(cursor, 'base64').toString('utf8')
      : undefined;

    /*
     *  [정렬 우선순위] : 정확도(키워드 위치) > 신뢰도(평점) > 고유성(ID)
     * 1. 가중치 점수(rank): 닉네임(A) > 태그(B) > 소개(C) 순으로 검색어 관련도 계산
     * 2. 리뷰 평점(avg_star): 가중치 점수가 동일할 경우 평점이 높은 순으로 노출
     * 3. 고유 ID(owner_id): 점수와 평점이 모두 동일할 경우 ID 내림차순 정렬 (페이지네이션 보장)
     */
    const rawReformers: ReformerSearchResult[] =
      await this.reformerModel.findByKeywordWithWeight(
        searchKeyword,
        decodedCursor,
        limit
      );
    const totalCount = await this.reformerModel.countByKeyword(searchKeyword);

    const hasNextPage = rawReformers.length > limit;
    const nodes = hasNextPage ? rawReformers.slice(0, limit) : rawReformers;

    const reformers: ReformerSummaryDTO[] = nodes.map((item) => ({
      owner_id: item.owner_id,
      nickname: item.nickname ?? '',
      keywords: item.keywords,
      bio: item.bio ?? '',
      profile_photo: item.profile_photo ?? '',
      avg_star: item.avg_star ? Number(item.avg_star) : 0,
      review_count: item.review_count ?? 0,
      trade_count: item.trade_count ?? 0
    }));

    // Encode next cursor to base64
    const nextCursor = hasNextPage
      ? Buffer.from(
          `${nodes[nodes.length - 1].rank}_${nodes[nodes.length - 1].avg_star}_${nodes[nodes.length - 1].owner_id}`
        ).toString('base64')
      : null;

    return {
      reformers,
      nextCursor,
      hasNextPage,
      totalCount
    };
  }

  public async getHome(): Promise<ReformerHomeResDTO> {
    const rawTop = await this.reformerModel.findTopByReviewCount(3);
    const topReformers: ReformerSummaryDTO[] = rawTop.map((item) => ({
      owner_id: item.owner_id,
      nickname: item.nickname ?? '',
      keywords: item.keywords,
      bio: item.bio ?? '',
      profile_photo: item.profile_photo ?? '',
      avg_star: item.avg_star ? Number(item.avg_star) : 0,
      review_count: item.review_count ?? 0,
      trade_count: item.trade_count ?? 0
    }));

    const rawPhotos = await this.reformerModel.findRecentDistinctFeedPhotos(4);
    const recentFeedPhotos: FeedPhotoDTO[] = rawPhotos.map((p) => ({
      feed_id: p.feed_id,
      content: p.content ?? null
    }));

    return {
      topReformers,
      recentFeedPhotos
    };
  }
}
