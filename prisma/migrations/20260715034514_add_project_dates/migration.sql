-- Thêm cột không NOT NULL trước, backfill dữ liệu project đã tồn tại, rồi mới
-- ràng buộc NOT NULL — bảng Project đã có dữ liệu thật nên không thể ADD COLUMN
-- NOT NULL trực tiếp như migration init (lúc đó bảng còn rỗng).
-- AlterTable
ALTER TABLE "Project" ADD COLUMN "dueDate" DATE;
ALTER TABLE "Project" ADD COLUMN "startDate" DATE;

-- Backfill project đã tồn tại: coi như bắt đầu từ ngày tạo, kéo dài 30 ngày.
-- Giá trị tạm này chỉ để thoả NOT NULL — seed.ts đặt lại giá trị thật cho
-- project mẫu ngay sau đó.
UPDATE "Project"
SET "startDate" = "createdAt"::date,
    "dueDate" = "createdAt"::date + INTERVAL '30 days'
WHERE "startDate" IS NULL;

ALTER TABLE "Project" ALTER COLUMN "dueDate" SET NOT NULL;
ALTER TABLE "Project" ALTER COLUMN "startDate" SET NOT NULL;

-- ngày bắt đầu không được sau hạn chót (cùng invariant với Task)
ALTER TABLE "Project" ADD CONSTRAINT "project_start_before_due"
  CHECK ("startDate" <= "dueDate");
