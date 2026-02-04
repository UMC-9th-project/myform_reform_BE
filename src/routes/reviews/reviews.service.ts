import { ReviewsRepository } from './reviews.repository.js';
import { ReviewDto, ReviewResponseDto, UnifiedProductInfo, RawUserInfo } from './reviews.model.js';
import { NotReviewOwnerError, ReviewNotFoundError } from './reviews.error.js';
export class ReviewsService {
  private reviewsRepository: ReviewsRepository;
  constructor() {
    this.reviewsRepository = new ReviewsRepository();
  }

  async getReviews(
    userId: string, 
    limit: number,
    cursor: string | undefined): Promise<ReviewResponseDto> {
    //리뷰와 관련 테이블 조회
    const reviews = await this.reviewsRepository.getReviewsWithAll(userId, limit, cursor);
    const hasNext = reviews.length > limit;
    const actualReviews = hasNext ? reviews.slice(0, limit) : reviews;
    
    // 아이템, 요청, 제안 Id 저장
    const itemIds = [
        ...new Set(actualReviews
        .filter((r) => r.order.target_type === 'ITEM')
        .map((r) => r.order.target_id))];
    const requestIds = [
        ...new Set(actualReviews
        .filter((r) => r.order.target_type === 'REQUEST')
        .map((r) => r.order.target_id))];
    const proposalIds = [
        ...new Set(actualReviews
        .filter((r) => r.order.target_type === 'PROPOSAL')
        .map((r) => r.order.target_id))];

    const userIds = [
      ...new Set(actualReviews.map((r) => r.user_id))
    ];
        
    // 아이템, 요청, 제안 정보 조회 (title, thumbnail)
    const [items, requests, proposals] = await Promise.all([
      this.reviewsRepository.getItemInfos(
        itemIds.filter((id): id is string => id !== null)
    ) as Promise<UnifiedProductInfo[]>,

      this.reviewsRepository.getRequestInfos(
        requestIds.filter((id): id is string => id !== null)
    ) as Promise<UnifiedProductInfo[]>,
    
      this.reviewsRepository.getProposalInfos(
        proposalIds.filter((id): id is string => id !== null)
    ) as Promise<UnifiedProductInfo[]>,
    ]);

    // 유저 정보 조회 (name, nickname, profile_photo)
    const userInfos = await this.reviewsRepository.getUserInfos(
      userIds.filter((id): id is string => id !== null));

    // 아이템, 요청, 제안 정보 맵 생성
    const productMap = new Map<string, UnifiedProductInfo>();
    items.forEach(i => productMap.set(i.product_id, i));
    requests.forEach(r => productMap.set(r.product_id, r));
    proposals.forEach(p => productMap.set(p.product_id, p));

    // 유저 정보 맵 생성
    const userInfoMap = new Map<string, RawUserInfo>();
    userInfos.forEach((u) => userInfoMap.set(u.user_id, u));

  const nextCursor = actualReviews.length > 0 ? actualReviews[actualReviews.length - 1].review_id : null;
  
  // 리뷰 정보 조회
  const data: ReviewDto[] = actualReviews.map((review) => {
    const user = userInfoMap.get(review.user_id ?? '');
    const product = productMap.get(review.order.target_id ?? '');
    const price = review.order.price?.toNumber() ?? 0;
    const deliveryFee = review.order.delivery_fee?.toNumber() ?? 0;
    const finalPrice = (price + deliveryFee).toString();
    const targetType = review.order.target_type ?? 'ITEM';
    const targetId = review.order.target_id ?? '';

    return {
      reviewId: review.review_id,
      userId: user?.user_id ?? review.user_id ?? '',
      userName: user?.name ?? '탈퇴한 사용자',
      userNickname: user?.nickname?? '알 수 없음',
      userProfilePhoto: user?.profile_photo ?? '',
      star: review.star ?? 0,
      createdAt: review.created_at!,
      content: review.content ?? '',
      orderId: review.order.order_id,
      price: price,
      deliveryFee: deliveryFee,
      finalPrice: finalPrice,
      orderTitle: product?.title ?? '',
      orderThumbnail: product?.thumbnail ?? '',
      targetType: targetType,
      targetId: targetId,
      reviewPhotos: review.review_photo.map((photo) => photo.content ?? '') ?? []
    }
  });

  return {
    data: data,
      cursor: nextCursor ?? null,
      hasNext: hasNext
    };
  }

  async deleteReview(userId: string, reviewId: string): Promise<string> {
    const review = await this.reviewsRepository.findReviewById(reviewId);
    if (!review) {
      throw new ReviewNotFoundError('리뷰를 찾을 수 없습니다.');
    }
    if (review.user_id !== userId) {
      throw new NotReviewOwnerError('리뷰를 삭제할 수 없습니다.');
    }
    await this.reviewsRepository.deleteReview(reviewId);
    return '리뷰 삭제가 완료되었습니다.';
  }
}