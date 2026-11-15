CREATE TABLE "ReaderAiBudget" (
  "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "shortStart" TIMESTAMPTZ NOT NULL,
  "shortUsed" INTEGER NOT NULL CHECK ("shortUsed" >= 0),
  "weekStart" TIMESTAMPTZ NOT NULL,
  "weekUsed" INTEGER NOT NULL CHECK ("weekUsed" >= 0)
);
ALTER TABLE "AgentJob" ADD COLUMN "usageUnits" INTEGER;
