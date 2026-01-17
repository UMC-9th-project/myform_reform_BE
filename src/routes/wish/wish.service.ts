import { CreateWishReqDTO, CreateWishResDTO } from './wish.dto.js';
import {
  UserReqForbiddenError,
  OwnerReqForbiddenError,
  UnknownRoleError
} from './wish.error.js';
import { createUserWish, createOwnerWish } from './wish.model.js';

type MockRole = 'USER' | 'OWNER';

export class WishService {
  constructor() {}

  async createWish(req: CreateWishReqDTO): Promise<CreateWishResDTO> {
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
      return { wishId, createdAt: new Date() } as CreateWishResDTO;
    }

    if (mockUser.role === 'OWNER') {
      if (req.type !== 'REQUEST') {
        throw new OwnerReqForbiddenError();
      }

      const created = await createOwnerWish(mockUser.id, req.itemId);
      const wishId = (created as { wish_id: string }).wish_id;
      return { wishId, createdAt: new Date() } as CreateWishResDTO;
    }

    throw new UnknownRoleError();
  }
}
