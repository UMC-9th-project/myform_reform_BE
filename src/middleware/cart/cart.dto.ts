import { IsArray, ArrayNotEmpty, IsUUID } from 'class-validator';

export class DeleteItemsDTO {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  cartIds!: string[];
}
