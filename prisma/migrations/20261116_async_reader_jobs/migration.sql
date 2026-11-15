ALTER TABLE "AgentJob" ADD COLUMN "reservation" JSONB;
ALTER TABLE "AgentJob" ADD COLUMN "conversationId" TEXT REFERENCES "ReaderAiConversation"("id") ON DELETE SET NULL;
ALTER TABLE "AgentJob" ADD COLUMN "userMessage" TEXT;
CREATE INDEX "AgentJob_owner_running" ON "AgentJob" ("ownerId") WHERE "status" = 'running';
