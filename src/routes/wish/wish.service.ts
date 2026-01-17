import { WishReqDTO, WishResDTO, DeleteWishResDTO } from './wish.dto.js';
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
  deleteOwnerWish
} from './wish.model.js';

type MockRole = 'USER' | 'OWNER';

export class WishService {
  constructor() {}

  async createWish(req: WishReqDTO): Promise<WishResDTO> {
    const mockUser = {
      id: '0f41af82-2259-4d42-8f1a-ca8771c8d473',
      role: 'USER' as MockRole
    };

    // 사용자 유형에 따른 검증
    if (mockUser.role === 'USER') {
      if (req.type === 'REQUEST') {
        throw new UserReqForbiddenError();
      }

      const created = await createUserWish(mockUser.id, req.type, req.itemId);
      const wishId = (created as { wish_id: string }).wish_id;
      return { wishId, createdAt: new Date() } as WishResDTO;
    }

    if (mockUser.role === 'OWNER') {
      if (req.type !== 'REQUEST') {
        throw new OwnerReqForbiddenError();
      }

      const created = await createOwnerWish(mockUser.id, req.itemId);
      const wishId = (created as { wish_id: string }).wish_id;
      return { wishId, createdAt: new Date() } as WishResDTO;
    }

    throw new UnknownRoleError();
  }

  async deleteWish(req: WishReqDTO): Promise<DeleteWishResDTO> {
    const mockUser = {
      id: '0f41af82-2259-4d42-8f1a-ca8771c8d473',
      role: 'USER' as MockRole
    };

    if (mockUser.role === 'USER') {
      if (req.type === 'REQUEST') {
        throw new UserReqForbiddenError();
      }

      const deleted = await deleteUserWish(mockUser.id, req.type, req.itemId);
      if (!deleted) throw new WishNotFoundError();
      return {
        wishId: deleted.wish_id,
        deletedAt: new Date()
      } as DeleteWishResDTO;
    }

    if (mockUser.role === 'OWNER') {
      if (req.type !== 'REQUEST') {
        throw new OwnerReqForbiddenError();
      }

      const deleted = await deleteOwnerWish(mockUser.id, req.itemId);
      if (!deleted) throw new WishNotFoundError();
      return {
        wishId: deleted.wish_id,
        deletedAt: new Date()
      } as DeleteWishResDTO;
    }

    throw new UnknownRoleError();
  }
}
