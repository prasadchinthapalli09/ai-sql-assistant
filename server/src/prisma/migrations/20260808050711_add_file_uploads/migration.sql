-- CreateEnum
CREATE TYPE "ConnectionSourceType" AS ENUM ('LIVE', 'UPLOAD');

-- AlterTable
ALTER TABLE "DatabaseConnection" ADD COLUMN     "fileType" TEXT,
ADD COLUMN     "originalFileName" TEXT,
ADD COLUMN     "schemaName" TEXT,
ADD COLUMN     "sourceType" "ConnectionSourceType" NOT NULL DEFAULT 'LIVE';
