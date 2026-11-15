CREATE TABLE "AgentRun" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "prompt" TEXT NOT NULL,
  "limit" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AgentRun_ownerId_createdAt_idx" ON "AgentRun" ("ownerId", "createdAt");
CREATE UNIQUE INDEX "AgentRun_one_running_per_owner" ON "AgentRun" ("ownerId") WHERE "status" = 'running';

CREATE TABLE "AgentStep" (
  "id" TEXT PRIMARY KEY,
  "runId" TEXT NOT NULL REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "label" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "model" TEXT NOT NULL,
  "servedModel" TEXT,
  "output" TEXT,
  "error" TEXT,
  "tokens" INTEGER,
  "cost" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AgentStep_runId_createdAt_idx" ON "AgentStep" ("runId", "createdAt");
