CREATE TABLE "AgentJob" (
  "id" UUID PRIMARY KEY,
  "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "prompt" TEXT NOT NULL,
  "answer" TEXT,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt" TIMESTAMPTZ NOT NULL DEFAULT now() + interval '100 seconds',
  "leaseUntil" TIMESTAMPTZ,
  "lease" UUID,
  "attempts" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "AgentJob_fifo" ON "AgentJob" ("createdAt", "id") WHERE "status" IN ('queued', 'running');
CREATE UNIQUE INDEX "AgentJob_owner_active" ON "AgentJob" ("ownerId") WHERE "status" IN ('queued', 'running');
CREATE INDEX "AgentJob_expiry" ON "AgentJob" ("expiresAt");
