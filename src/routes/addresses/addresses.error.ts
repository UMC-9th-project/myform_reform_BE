import { BasicError } from "../../middleware/error.js";

export class AddressesGetError extends BasicError {
  constructor(description: string) {
  super(400, 'Addresses_100', '주소 조회중 오류가 발생했습니다.', description);
  }
}

export class AddressNotFoundError extends BasicError {
  constructor(description: string) {
    super(400, 'Addresses_101', '입력 받은 주소를 찾을 수 없습니다.', description);
  }
}