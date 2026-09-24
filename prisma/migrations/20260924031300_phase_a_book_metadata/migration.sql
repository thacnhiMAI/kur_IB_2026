-- AlterTable
ALTER TABLE "Book"
ADD COLUMN "subtitle" TEXT,
ADD COLUMN "originalTitle" TEXT,
ADD COLUMN "isbn10" TEXT,
ADD COLUMN "isbn13" TEXT,
ADD COLUMN "publisher" TEXT,
ADD COLUMN "edition" TEXT,
ADD COLUMN "ratingAverage" DOUBLE PRECISION,
ADD COLUMN "ratingsCount" INTEGER,
ADD COLUMN "sourcePrimary" TEXT,
ADD COLUMN "sourceExternalId" TEXT,
ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "BookSourceRecord" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "rawChecksum" TEXT,
    "rawPayload" JSONB,
    "lastImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookSourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookCoverAsset" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "cachedPath" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "dominantColor" TEXT,
    "blurDataUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "lastFetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookCoverAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Book_isbn10_key" ON "Book"("isbn10");

-- CreateIndex
CREATE UNIQUE INDEX "Book_isbn13_key" ON "Book"("isbn13");

-- CreateIndex
CREATE UNIQUE INDEX "BookSourceRecord_provider_externalId_key" ON "BookSourceRecord"("provider", "externalId");

-- AddForeignKey
ALTER TABLE "BookSourceRecord" ADD CONSTRAINT "BookSourceRecord_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookCoverAsset" ADD CONSTRAINT "BookCoverAsset_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
