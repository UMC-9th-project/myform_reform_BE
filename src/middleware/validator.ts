import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationError } from './error.js';

export async function validateOrThrow<T extends object>(
  dtoClass: ClassConstructor<T>,
  payload: unknown
): Promise<T> {
  const dto = plainToInstance(dtoClass, payload) as T;
  const errors = await validate(dto);
  if (errors.length > 0) {
    const e = errors[0];
    const messages = e.constraints ? Object.values(e.constraints) : [];
    const firstMessage =
      messages.length > 0 ? String(messages[0]) : 'Invalid request.';
    throw new ValidationError({
      field: e.property,
      value: e.value,
      messages: firstMessage
    });
  }
  return dto;
}
