import {
  ReformerSearchResDTO,
  ReformerSummaryDTO,
  ReformerHomeResDTO,
  FeedPhotoDTO,
  ReformerListResDTO,
  ReformerFeedResDTO,
  FeedItemDTO,
  FeedPhotosResDTO,
  FeedPhotoDetailDTO
} from './dto/reformer.res.dto.js';
import {
  ReformerSearchReqDTO,
  ReformerListReqDTO
} from './dto/reformer.req.dto.js';
import { ReformerModel } from './reformer.model.js';
import { ReformerSearchResult } from './reformer.model.js';
import type {
  ReformerCursorParts,
  NameCursor,
  RatingCursor,
  TradeCursor,
  SearchCursor,
  FeedCursor
} from './reformer.model.js';
import { CursorUtil } from '../../utils/cursorUtil.js';

type ReformerRawData = {
  owner_id: string;
  nickname: string | null;
  keywords: string[] | null;
  bio: string | null;
  profile_photo: string | null;
  avg_star: number | { toNumber(): number } | null;
  review_count: number | null;
  trade_count: number | null;
};

// 공통 매핑 함수
const toReformerSummaryDTO = (item: ReformerRawData): ReformerSummaryDTO => ({
  owner_id: item.owner_id,
  nickname: item.nickname ?? '',
  keywords: item.keywords ?? [],
  bio: item.bio ?? '',
  profile_photo: item.profile_photo ?? '',
  avg_star: item.avg_star
    ? typeof item.avg_star === 'number'
      ? item.avg_star
      : Number(item.avg_star)
    : 0,
  review_count: item.review_count ?? 0,
  trade_count: item.trade_count ?? 0
});

export class ReformerService {
  private reformerModel = new ReformerModel();

  // 리폼러 검색
  public async searchReformers(
    dto: ReformerSearchReqDTO
  ): Promise<ReformerSearchResDTO> {
    const { keyword, cursor } = dto;
    const limit = 9;
    const searchKeyword = keyword!.trim();

    const decodedCursor = CursorUtil.decode<SearchCursor>(cursor);

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

    const reformers = nodes.map(toReformerSummaryDTO);

    const nextCursor = hasNextPage
      ? CursorUtil.encode<SearchCursor>([
          nodes[nodes.length - 1].rank,
          Number(nodes[nodes.length - 1].avg_star) ?? 0,
          nodes[nodes.length - 1].owner_id
        ])
      : null;

    return {
      reformers,
      nextCursor,
      hasNextPage,
      totalCount
    };
  }

  // 리폼러 홈 데이터 조회
  public async getHome(): Promise<ReformerHomeResDTO> {
    const rawTop = await this.reformerModel.findTopByReviewCount(3);
    const topReformers = rawTop.map(toReformerSummaryDTO);

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

  // 전체 리폼러 탐색
  public async searchAllReformers(
    dto: ReformerListReqDTO
  ): Promise<ReformerListResDTO> {
    const { sort = 'name', cursor } = dto;
    const perPage = 15;

    let cursorParts: ReformerCursorParts | undefined = undefined;

    if (sort === 'name') {
      const decoded = CursorUtil.decode<NameCursor>(cursor);
      if (decoded && decoded.length >= 2) {
        cursorParts = [String(decoded[0]), String(decoded[1])] as NameCursor;
      }
    } else if (sort === 'rating') {
      const decoded = CursorUtil.decode<RatingCursor>(cursor);
      if (decoded && decoded.length >= 2) {
        const avg =
          typeof decoded[0] === 'number' ? decoded[0] : Number(decoded[0]);
        cursorParts = [avg, String(decoded[1])] as RatingCursor;
      }
    } else {
      const decoded = CursorUtil.decode<TradeCursor>(cursor);
      if (decoded && decoded.length >= 2) {
        cursorParts = [Number(decoded[0]), String(decoded[1])] as TradeCursor;
      }
    }

    const raw = await this.reformerModel.findAllWithSort(
      sort,
      cursorParts,
      perPage
    );

    const totalCount = await this.reformerModel.countAll();

    const hasNextPage = raw.length > perPage;
    const nodes = hasNextPage ? raw.slice(0, perPage) : raw;

    const reformers = nodes.map(toReformerSummaryDTO);

    let nextCursor: string | null = null;
    if (hasNextPage) {
      const last = nodes[nodes.length - 1];
      if (sort === 'name') {
        nextCursor = CursorUtil.encode<NameCursor>([
          last.nickname ?? '',
          last.owner_id
        ]);
      } else if (sort === 'rating') {
        nextCursor = CursorUtil.encode<RatingCursor>([
          Number(last.avg_star) ?? 0,
          last.owner_id
        ]);
      } else {
        nextCursor = CursorUtil.encode<TradeCursor>([
          last.trade_count ?? 0,
          last.owner_id
        ]);
      }
    }

    return {
      reformers,
      nextCursor,
      hasNextPage,
      perPage,
      totalCount
    };
  }

  // 전체 피드 탐색
  public async getReformerFeed(cursor?: string): Promise<ReformerFeedResDTO> {
    const limit = 20;
    const decodedCursor = CursorUtil.decode<FeedCursor>(cursor);
    const raw = await this.reformerModel.findFeeds(decodedCursor, limit);

    const hasNextPage = raw.length > limit;
    const nodes = hasNextPage ? raw.slice(0, limit) : raw;

    const feeds: FeedItemDTO[] = nodes.map((item) => ({
      feed_id: item.feed_id,
      photo_url: item.feed_photo[0]?.content ?? null,
      is_multi_photo: item._count.feed_photo > 1
    }));

    const nextCursor = hasNextPage
      ? CursorUtil.encode<FeedCursor>([nodes[nodes.length - 1].feed_id])
      : null;

    return {
      feeds,
      nextCursor,
      hasNextPage
    };
  }

  // 피드 내 전체 사진 조회
  public async getFeedPhotos(feedId: string): Promise<FeedPhotosResDTO> {
    const photos = await this.reformerModel.findFeedPhotos(feedId);

    const photoDetails: FeedPhotoDetailDTO[] = photos.map((photo) => ({
      photo_order: photo.photo_order ?? 0,
      url: photo.content ?? null
    }));

    return {
      feed_id: feedId,
      photos: photoDetails
    };
  }
}
