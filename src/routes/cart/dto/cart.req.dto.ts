import { IsArray, ArrayNotEmpty, IsUUID, IsInt, Min } from 'class-validator';

export class DeleteItemsDTO {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  cartIds!: string[];
}

export class AddToCartDTO {
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  optionItemIds!: string[];
}
