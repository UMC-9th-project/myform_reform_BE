import { ReviewsRepository } from './reviews.repository.js';
import { ProfileRepository } from '../profile/profile.repository.js';
import { ReviewDto, ReviewResponseDto, UnifiedProductInfo } from './reviews.model.js';
import { ReviewNotFoundError } from './reviews.error.js';
export class ReviewsService {
  private reviewsRepository: ReviewsRepository;
  constructor() {
    this.reviewsRepository = new ReviewsRepository();
  }

  async getReviews(
    userId: string, 
    limit: number,
    cursor: string | undefined): Promise<ReviewResponseDto> {
    const reviews = await this.reviewsRepository.getReviewsWithAll(userId, limit, cursor);
    const hasNext = reviews.length > limit;
    const actualReviews = hasNext ? reviews.slice(0, limit) : reviews;
    
    const ItemIds = [
        ...new Set(actualReviews
        .filter((r) => r.order.target_type === 'ITEM')
        .map((r) => r.order.target_id))];
    const RequestIds = [
        ...new Set(actualReviews
        .filter((r) => r.order.target_type === 'REQUEST')
        .map((r) => r.order.target_id))];
    const ProposalIds = [
        ...new Set(actualReviews
        .filter((r) => r.order.target_type === 'PROPOSAL')
        .map((r) => r.order.target_id))];
        
    const [items, requests, proposals] = await Promise.all([
      this.reviewsRepository.getItemInfos(
        ItemIds.filter((id): id is string => id !== null)
    ) as Promise<UnifiedProductInfo[]>,

      this.reviewsRepository.getRequestInfos(
        RequestIds.filter((id): id is string => id !== null)
    ) as Promise<UnifiedProductInfo[]>,
    
      this.reviewsRepository.getProposalInfos(
        ProposalIds.filter((id): id is string => id !== null)
    ) as Promise<UnifiedProductInfo[]>,
    ]);

    const userInfo = await this.reviewsRepository.getUserInfo(userId);

    const productMap = new Map();
    items.forEach(i => productMap.set(i.product_id, i));
    requests.forEach(r => productMap.set(r.product_id, r));
    proposals.forEach(p => productMap.set(p.product_id, p));

  const nextCursor = actualReviews.length > 0 ? actualReviews[actualReviews.length - 1].review_id : null;

  const data: ReviewDto[] = actualReviews.map((review) => ({
    reviewId: review.review_id,
    userId: userInfo.user_id,
    userName: userInfo.name ?? '',
    userNickname: userInfo.nickname ?? '',
    userProfilePhoto: userInfo.profile_photo ?? '',
    star: review.star ?? 0,
    createdAt: review.created_at!,
    content: review.content ?? '',
    orderId: review.order.order_id,
    price: review.order.price?.toNumber() ?? 0,
    deliveryFee: review.order.delivery_fee?.toNumber() ?? 0,
    finalPrice: ((review.order.price?.toNumber() ?? 0) + (review.order.delivery_fee?.toNumber() ?? 0)).toString(),
    orderTitle: productMap.get(review.order.target_id)?.title ?? '',
    orderThumbnail: productMap.get(review.order.target_id)?.thumbnail ?? '',
    targetType: review.order.target_type!,
    targetId: review.order.target_id!,
  }));

  return {
    data: data,
      cursor: nextCursor ?? null,
      hasNext: hasNext
    };
  }

  async deleteReview(userId: string, reviewId: string): Promise<string> {
    const deletedCount = await this.reviewsRepository.deleteReview(userId, reviewId);
    if (deletedCount === 0) {
      throw new ReviewNotFoundError('리뷰를 찾을 수 없습니다.');
    }
    return '리뷰 삭제가 완료되었습니다.';
  }
}