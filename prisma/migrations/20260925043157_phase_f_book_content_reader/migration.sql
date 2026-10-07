-- CreateEnum
CREATE TYPE "BookContentSourceType" AS ENUM ('PDF', 'EXTERNAL_LINK');

-- CreateEnum
CREATE TYPE "BookContentStatus" AS ENUM ('READY', 'PROCESSING', 'FAILED');

-- CreateTable
CREATE TABLE "BookContent" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "sourceType" "BookContentSourceType" NOT NULL,
    "storagePath" TEXT,
    "publicUrl" TEXT,
    "externalUrl" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "uploadedByUserId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "BookContentStatus" NOT NULL DEFAULT 'READY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "contentId" TEXT,
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPage" INTEGER NOT NULL DEFAULT 0,
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookContent_bookId_isPrimary_idx" ON "BookContent"("bookId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingProgress_userId_bookId_key" ON "ReadingProgress"("userId", "bookId");

-- AddForeignKey
ALTER TABLE "BookContent" ADD CONSTRAINT "BookContent_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookContent" ADD CONSTRAINT "BookContent_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "BookContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
