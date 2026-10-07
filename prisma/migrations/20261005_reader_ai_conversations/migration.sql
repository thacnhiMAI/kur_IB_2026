CREATE TABLE "ReaderAiConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "contentId" TEXT,
    "scope" TEXT NOT NULL,
    "page" INTEGER,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReaderAiConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReaderAiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReaderAiMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReaderAiConversation_userId_bookId_updatedAt_idx" ON "ReaderAiConversation"("userId", "bookId", "updatedAt");
CREATE INDEX "ReaderAiConversation_userId_bookId_scope_page_idx" ON "ReaderAiConversation"("userId", "bookId", "scope", "page");
CREATE INDEX "ReaderAiMessage_conversationId_createdAt_idx" ON "ReaderAiMessage"("conversationId", "createdAt");

ALTER TABLE "ReaderAiConversation" ADD CONSTRAINT "ReaderAiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReaderAiConversation" ADD CONSTRAINT "ReaderAiConversation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReaderAiConversation" ADD CONSTRAINT "ReaderAiConversation_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "BookContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReaderAiMessage" ADD CONSTRAINT "ReaderAiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ReaderAiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
