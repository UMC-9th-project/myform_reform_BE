import {
  WishResDTO,
  DeleteWishResDTO,
  WishListResDTO
} from './dto/wish.res.dto.js';
import { WishReqDTO, WishType } from './dto/wish.req.dto.js';
import {
  UserReqForbiddenError,
  OwnerReqForbiddenError,
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

type Role = 'USER' | 'OWNER';

export class WishService {
  constructor() {}

  private validateRoleAccess(role: Role, type: WishType) {
    if (role === 'USER' && type === 'REQUEST')
      throw new UserReqForbiddenError();
    if (role === 'OWNER' && type !== 'REQUEST')
      throw new OwnerReqForbiddenError();
  }

  async createWish(req: WishReqDTO): Promise<WishResDTO> {
    const mockUser = {
      id: '0f41af82-2259-4d42-8f1a-ca8771c8d473',
      role: 'USER' as Role
    };

    this.validateRoleAccess(mockUser.role, req.type);

    // 사용자 유형에 따른 처리
    if (mockUser.role === 'USER') {
      const created = await createUserWish(
        mockUser.id,
        req.type as UserAllowedTarget,
        req.itemId
      );
      const wishId = (created as { wish_id: string }).wish_id;
      return { wishId, createdAt: new Date() } as WishResDTO;
    }

    if (mockUser.role === 'OWNER') {
      const created = await createOwnerWish(mockUser.id, req.itemId);
      const wishId = (created as { wish_id: string }).wish_id;
      return { wishId, createdAt: new Date() } as WishResDTO;
    }

    throw new UnknownRoleError();
  }

  async deleteWish(req: WishReqDTO): Promise<DeleteWishResDTO> {
    const mockUser = {
      id: '0f41af82-2259-4d42-8f1a-ca8771c8d473',
      role: 'USER' as Role
    };

    this.validateRoleAccess(mockUser.role, req.type);

    if (mockUser.role === 'USER') {
      const deleted = await deleteUserWish(
        mockUser.id,
        req.type as UserAllowedTarget,
        req.itemId
      );
      if (!deleted) throw new WishNotFoundError();
      return {
        wishId: deleted.wish_id,
        deletedAt: new Date()
      } as DeleteWishResDTO;
    }

    if (mockUser.role === 'OWNER') {
      const deleted = await deleteOwnerWish(mockUser.id, req.itemId);
      if (!deleted) throw new WishNotFoundError();
      return {
        wishId: deleted.wish_id,
        deletedAt: new Date()
      } as DeleteWishResDTO;
    }

    throw new UnknownRoleError();
  }

  async getWishList(type: WishType): Promise<WishListResDTO> {
    const mockUser = {
      id: '0f41af82-2259-4d42-8f1a-ca8771c8d473',
      role: 'USER' as Role
    };

    this.validateRoleAccess(mockUser.role, type);

    if (mockUser.role === 'USER') {
      const list = await getUserWishList(
        mockUser.id,
        type as UserAllowedTarget
      );
      return { list } as WishListResDTO;
    }

    if (mockUser.role === 'OWNER') {
      const list = await getOwnerWishList(mockUser.id);
      return { list } as WishListResDTO;
    }

    throw new UnknownRoleError();
  }
}
