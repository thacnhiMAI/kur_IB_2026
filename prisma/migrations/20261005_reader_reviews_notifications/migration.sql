-- Allow multiple reviews from the same reader for the same book while every
-- submission is moderated independently.
ALTER TABLE "Review" ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP INDEX IF EXISTS "Review_userId_bookId_key";
CREATE INDEX IF NOT EXISTS "Review_userId_bookId_createdAt_idx"
  ON "Review"("userId", "bookId", "createdAt");
CREATE INDEX IF NOT EXISTS "Review_bookId_status_createdAt_idx"
  ON "Review"("bookId", "status", "createdAt");

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_createdAt_idx"
  ON "Notification"("userId", "readAt", "createdAt");
DO $$ BEGIN
  ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ReaderAnnotation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "contentId" TEXT,
  "page" INTEGER NOT NULL,
  "quote" TEXT,
  "note" TEXT,
  "color" TEXT NOT NULL DEFAULT 'yellow',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReaderAnnotation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ReaderAnnotation_userId_bookId_page_idx"
  ON "ReaderAnnotation"("userId", "bookId", "page");
CREATE INDEX IF NOT EXISTS "ReaderAnnotation_bookId_page_idx"
  ON "ReaderAnnotation"("bookId", "page");
DO $$ BEGIN
  ALTER TABLE "ReaderAnnotation"
    ADD CONSTRAINT "ReaderAnnotation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ReaderAnnotation"
    ADD CONSTRAINT "ReaderAnnotation_bookId_fkey"
    FOREIGN KEY ("bookId") REFERENCES "Book"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ReaderAnnotation"
    ADD CONSTRAINT "ReaderAnnotation_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "BookContent"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "UserAvatar" (
  "userId" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "mimeType" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserAvatar_pkey" PRIMARY KEY ("userId")
);
DO $$ BEGIN
  ALTER TABLE "UserAvatar"
    ADD CONSTRAINT "UserAvatar_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

