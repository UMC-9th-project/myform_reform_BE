import { delivery_address } from "@prisma/client";

export class AddressesResponseDto {
  addressId: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  isDefault: boolean;
  phone: string;
  recipient: string;
  addressName?: string;
  createdAt: Date;
  
  constructor(addressInfo: delivery_address) {
    this.addressId = addressInfo.delivery_address_id;
    this.recipient = addressInfo.recipient!;
    this.phone = addressInfo.phone!;
    this.postalCode = addressInfo.postal_code!;
    this.address = addressInfo.address!;
    this.isDefault = addressInfo.is_default ?? false;
    this.addressDetail = addressInfo.address_detail ?? "";
    this.addressName = addressInfo.address_name ?? "";
    this.createdAt = addressInfo.created_at!;
  }
}
