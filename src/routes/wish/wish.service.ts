import {
  WishResDTO,
  DeleteWishResDTO,
  WishListResDTO
} from './dto/wish.res.dto.js';
import { WishReqDTO, WishType } from './dto/wish.req.dto.js';
import {
  UserReqForbiddenError,
  ReformerReqForbiddenError,
  UnknownRoleError,
  WishNotFoundError
} from './wish.error.js';
import {
  createUserWish,
  createOwnerWish,
  deleteUserWish,
  deleteOwnerWish,
  getUserWishList,
  getOwnerWishList
} from './wish.model.js';
import type { UserAllowedTarget } from './wish.model.js';
import { Role } from '../auth/auth.dto.js';

export class WishService {
  constructor() {}

  private validateRoleAccess(role: Role, type: WishType) {
    if (role === 'user' && type === 'REQUEST')
      throw new UserReqForbiddenError();
    if (role === 'reformer' && type !== 'REQUEST')
      throw new ReformerReqForbiddenError();
  }

  async createWish(
    req: WishReqDTO,
    userId: string,
    role: Role
  ): Promise<WishResDTO> {
    this.validateRoleAccess(role, req.type);

    // 사용자 유형에 따른 처리
    if (role === 'user') {
      const created = await createUserWish(
        userId,
        req.type as UserAllowedTarget,
        req.itemId
      );
      const wishId = (created as { wish_id: string }).wish_id;
      return { wishId, createdAt: new Date() } as WishResDTO;
    }

    if (role === 'reformer') {
      const created = await createOwnerWish(userId, req.itemId);
      const wishId = (created as { wish_id: string }).wish_id;
      return { wishId, createdAt: new Date() } as WishResDTO;
    }

    throw new UnknownRoleError();
  }

  async deleteWish(
    req: WishReqDTO,
    userId: string,
    role: Role
  ): Promise<DeleteWishResDTO> {
    this.validateRoleAccess(role, req.type);

    if (role === 'user') {
      const deleted = await deleteUserWish(
        userId,
        req.type as UserAllowedTarget,
        req.itemId
      );
      if (!deleted) throw new WishNotFoundError();
      return {
        wishId: deleted.wish_id,
        deletedAt: new Date()
      } as DeleteWishResDTO;
    }

    if (role === 'reformer') {
      const deleted = await deleteOwnerWish(userId, req.itemId);
      if (!deleted) throw new WishNotFoundError();
      return {
        wishId: deleted.wish_id,
        deletedAt: new Date()
      } as DeleteWishResDTO;
    }

    throw new UnknownRoleError();
  }

  async getWishList(
    type: WishType,
    userId: string,
    role: Role
  ): Promise<WishListResDTO> {
    this.validateRoleAccess(role, type);

    if (role === 'user') {
      const list = await getUserWishList(userId, type as UserAllowedTarget);
      return { list } as WishListResDTO;
    }

    if (role === 'reformer') {
      const list = await getOwnerWishList(userId);
      return { list } as WishListResDTO;
    }

    throw new UnknownRoleError();
  }
}
