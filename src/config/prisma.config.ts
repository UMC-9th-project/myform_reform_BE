import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import type { Prisma } from '@prisma/client';

// 기본 PrismaClient 인스턴스 생성
const prismaClient = new PrismaClient();

// 트랜잭션 컨텍스트를 유지하기 위한 AsyncLocalStorage 저장소 생성
export const transactionStorage =
  new AsyncLocalStorage<Prisma.TransactionClient>();

// prismaClient를 감싸서 호출 시점에 트랜잭션 개체가 있으면 해당 개체를 사용하도록 프록시 생성
export const prisma: PrismaClient = new Proxy(prismaClient, {
  get(target, property, receiver) {
    const tx = transactionStorage.getStore();
    const client = tx || target;
    const value = Reflect.get(client, property, receiver);

    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

// Prisma의 $transaction을 실행하고, 생성된 tx 객체를 AsyncLocalStorage에 저장
export const runInTransaction = async <T>(
  callback: () => Promise<T>
): Promise<T> => {
  return await prismaClient.$transaction(
    async (tx: Prisma.TransactionClient) => {
      return transactionStorage.run(tx, callback);
    }
  );
};

export default prisma;
