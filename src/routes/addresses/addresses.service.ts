import { AddressesCreateInput, AddressesCreateRequestDto, AddressesDeleteInput, AddressesGetRequestDto } from './dto/addresses.req.dto.js';
import { AddressesResponseDto } from './dto/addresses.res.dto.js';
import { AddressesRepository } from './addresses.repository.js';
import { AddressesGetError, AddressNotFoundError } from './addresses.error.js';
import { runInTransaction } from '../../config/prisma.config.js';
import { validatePhoneNumber, validatePostalCode } from '../../utils/validators.js';
import { InputValidationError } from '../auth/auth.error.js';

export class AddressesService {
  private addressesRepository: AddressesRepository;
  constructor() {
    this.addressesRepository = new AddressesRepository();
  }
  // 주소를 조회합니다.
  async getAddresses(dto: AddressesGetRequestDto): Promise<AddressesResponseDto[]> {   
    try {
      const addresses = await this.addressesRepository.getAddresses(dto);
      return addresses.map((address) => new AddressesResponseDto(address));
    } catch (error) {
      console.error(error);
      throw new AddressesGetError('주소 조회 중 오류가 발생했습니다.');
    }
  }

  // 주소를 생성합니다.
  async createAddress(userId: string, requestBody: AddressesCreateRequestDto): Promise<AddressesResponseDto> {
    return await runInTransaction(async () => {
      this.validateAddress(requestBody);
      if (requestBody.isDefault) {
        await this.addressesRepository.clearDefaultStatusByUserId(userId)
      } else {
      const isFirstAddress = await this.addressesRepository.existsByUserId(userId)
        if (isFirstAddress) {
          requestBody.isDefault = true;
        }
      }
      const input = new AddressesCreateInput(userId, requestBody);
      const newAddress = await this.addressesRepository.saveAddress(input);
      return new AddressesResponseDto(newAddress);
    });
  }

  // 주소를 삭제합니다.
  async deleteAddress(userId: string, addressId: string): Promise<string> {
    return await runInTransaction(async () => {
      const input = new AddressesDeleteInput(userId, addressId);
      const targetAddress = await this.addressesRepository.getAddressById(addressId);
      if (!targetAddress) {
        throw new AddressNotFoundError('입력 받은 주소를 찾을 수 없습니다.');
      }
      await this.addressesRepository.deleteAddressById(addressId);
      if (targetAddress.is_default) {
        const nextDefaultAddress = await this.addressesRepository.getNextDefaultAddress(userId);
        if (nextDefaultAddress) {
          await this.addressesRepository.updateDefaultStatusByUserId(nextDefaultAddress.delivery_address_id, { is_default: true });
        }
      }
      await this.addressesRepository.deleteAddress(input);
      return '주소 삭제가 완료되었습니다.';
    });
  }
  private validateAddress(requestBody: AddressesCreateRequestDto): void {
    const { postalCode, recipient, phone } = requestBody;
    // 숫자 만으로 구성된 우편번호 형식인지 확인
    validatePostalCode(postalCode);
    if (recipient.length === 0) {
      throw new InputValidationError('수령인은 필수 입력 항목입니다.');
    }
    validatePhoneNumber(phone);
  }
}