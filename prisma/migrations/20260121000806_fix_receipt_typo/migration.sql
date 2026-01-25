-- AlterTable: reciept 테이블명과 컬럼명을 receipt로 수정
BEGIN;

-- 1. 테이블명 변경: reciept → receipt
ALTER TABLE IF EXISTS reciept RENAME TO receipt;

-- 2. 컬럼명 변경: reciept_id → receipt_id
ALTER TABLE IF EXISTS receipt RENAME COLUMN reciept_id TO receipt_id;

-- 3. FK 제약조건 업데이트 (order 테이블)
-- 기존 제약조건 삭제
ALTER TABLE IF EXISTS "order" DROP CONSTRAINT IF EXISTS FK_receipt_TO_order_1;

-- 새로운 제약조건 추가 (receipt_id 참조)
ALTER TABLE IF EXISTS "order" 
ADD CONSTRAINT FK_receipt_TO_order_1 
FOREIGN KEY (receipt_id) REFERENCES receipt(receipt_id) 
ON DELETE CASCADE ON UPDATE NO ACTION;

-- 4. 인덱스는 테이블명과 컬럼명 변경 시 자동으로 업데이트됨
-- idx_receipt_number 인덱스는 receipt 테이블의 receipt_number 컬럼을 참조하므로 자동 업데이트

COMMIT;
