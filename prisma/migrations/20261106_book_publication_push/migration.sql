CREATE TABLE "PushSubscription" (
    "id" SERIAL PRIMARY KEY,
    "endpoint" TEXT NOT NULL UNIQUE,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

CREATE TABLE "BookPublicationPush" (
    "bookId" TEXT PRIMARY KEY REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDeviceId" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "BookPublicationPush_availableAt_idx" ON "BookPublicationPush"("availableAt");

-- Keep the book and its notification event in the same transaction for every writer.
CREATE FUNCTION enqueue_book_publication_push() RETURNS TRIGGER AS $$
BEGIN
    IF NOT NEW."isPublished" THEN
        DELETE FROM "BookPublicationPush" WHERE "bookId" = NEW."id";
    ELSIF TG_OP = 'INSERT' OR NOT OLD."isPublished" THEN
        INSERT INTO "BookPublicationPush" ("bookId") VALUES (NEW."id")
        ON CONFLICT ("bookId") DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER book_publication_push
AFTER INSERT OR UPDATE OF "isPublished" ON "Book"
FOR EACH ROW EXECUTE FUNCTION enqueue_book_publication_push();
