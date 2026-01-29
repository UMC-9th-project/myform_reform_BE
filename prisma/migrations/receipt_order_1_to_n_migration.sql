-- 마이그레이션: receipt-order 1:1 관계를 1:N 관계로 변경
-- 실행 전 백업 권장

BEGIN;

-- 1. receipt 테이블 수정
-- 1-1. receipt_number 필드 추가
ALTER TABLE reciept ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(20);
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipt_number ON reciept(receipt_number) WHERE receipt_number IS NOT NULL;

-- 1-2. total_amount 필드 추가
ALTER TABLE reciept ADD COLUMN IF NOT EXISTS total_amount DECIMAL;

-- 1-3. 기존 order.order_number를 receipt.receipt_number로 복사
UPDATE reciept r
SET receipt_number = o.order_number
FROM "order" o
WHERE r.order_id = o.order_id AND o.order_number IS NOT NULL;

-- 1-4. 기존 order.amount를 receipt.total_amount로 복사
UPDATE reciept r
SET total_amount = o.amount
FROM "order" o
WHERE r.order_id = o.order_id AND o.amount IS NOT NULL;

-- 2. order 테이블 수정
-- 2-1. receipt_id 필드 추가 (NULL 허용)
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS receipt_id UUID;

-- 2-2. 기존 receipt.order_id를 order.receipt_id로 복사
UPDATE "order" o
SET receipt_id = r.reciept_id
FROM reciept r
WHERE o.order_id = r.order_id;

-- 2-3. receipt_id NOT NULL 제약조건 추가
ALTER TABLE "order" ALTER COLUMN receipt_id SET NOT NULL;

-- 2-4. receipt_id FK 제약조건 추가
ALTER TABLE "order" 
ADD CONSTRAINT FK_receipt_TO_order_1 
FOREIGN KEY (receipt_id) REFERENCES reciept(reciept_id) 
ON DELETE CASCADE ON UPDATE NO ACTION;

-- 2-5. receipt_id 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_order_receipt ON "order"(receipt_id);

-- 3. review 테이블 수정
-- 3-1. order_id 필드 추가 (NULL 허용)
ALTER TABLE review ADD COLUMN IF NOT EXISTS order_id UUID;

-- 3-2. 기존 receipt의 order를 찾아서 review.order_id에 복사
-- (receipt와 order가 1:1이었으므로, receipt_id로 order를 찾을 수 있음)
UPDATE review r
SET order_id = o.order_id
FROM reciept rec
INNER JOIN "order" o ON o.order_id = rec.order_id
WHERE r.reciept_id = rec.reciept_id;

-- 3-3. order_id NOT NULL 제약조건 추가
ALTER TABLE review ALTER COLUMN order_id SET NOT NULL;

-- 3-4. order_id FK 제약조건 추가
ALTER TABLE review 
ADD CONSTRAINT FK_order_TO_review_1 
FOREIGN KEY (order_id) REFERENCES "order"(order_id) 
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 3-5. order_id 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_review_order ON review(order_id);

-- 3-6. 기존 reciept_id 인덱스 제거
DROP INDEX IF EXISTS idx_review_reciept;

-- 3-7. reciept_id FK 제약조건 제거
ALTER TABLE review DROP CONSTRAINT IF EXISTS FK_reciept_TO_review_1;

-- 3-8. reciept_id 컬럼 제거
ALTER TABLE review DROP COLUMN IF EXISTS reciept_id;

-- 4. receipt 테이블에서 order_id 제거
-- 4-1. FK 제약조건 제거
ALTER TABLE reciept DROP CONSTRAINT IF EXISTS FK_order_TO_reciept_1;

-- 4-2. order_id 컬럼 제거
ALTER TABLE reciept DROP COLUMN IF EXISTS order_id;

COMMIT;
