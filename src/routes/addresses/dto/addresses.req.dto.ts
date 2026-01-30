// 주소 조회 요청 DTO
export class AddressesGetRequestDto {
  page: number;
  limit: number;
  createdAtOrder: 'asc' | 'desc';
  userId: string;

  constructor(
      page: number, limit: number, userId: string, createdAtOrder: 'asc' | 'desc') {
        this.page = page;
        this.limit = limit;
        this.createdAtOrder = createdAtOrder;
        this.userId = userId;
    }   
}

// 주소 생성 요청 DTO
export class AddressesCreateRequestDto {
  postalCode: string;
  address: string;
  addressDetail?: string;
  isDefault: boolean;
  addressName?: string;
  recipient: string;
  phone: string;

  constructor(
    postalCode: string, address: string, isDefault: boolean, recipient: string, phone: string, addressName?: string, addressDetail?: string) {
    this.postalCode = postalCode;
    this.address = address;
    this.addressDetail = addressDetail;
    this.isDefault = isDefault;
    this.addressName = addressName;
    this.recipient = recipient ?? "";
    this.phone = phone ?? "";
  }
}

export class AddressesCreateInput{
  userId: string;
  postalCode: string;
  address: string;
  addressDetail?: string;
  isDefault: boolean;
  addressName?: string;
  recipient: string;
  phone: string;

  constructor(userId: string, requestBody: AddressesCreateRequestDto) {
    this.userId = userId;
    this.postalCode = requestBody.postalCode;
    this.address = requestBody.address;
    this.addressDetail = requestBody.addressDetail;
    this.isDefault = requestBody.isDefault;
    this.addressName = requestBody.addressName;
    this.recipient = requestBody.recipient;
    this.phone = requestBody.phone;
  }
}
