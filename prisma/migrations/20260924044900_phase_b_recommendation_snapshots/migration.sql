-- AlterTable
ALTER TABLE "RecommendationItem" ADD COLUMN     "badge" TEXT,
ADD COLUMN     "score" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "RecommendationSnapshot" ADD COLUMN     "contextHash" TEXT,
ADD COLUMN     "insights" JSONB,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ready',
ADD COLUMN     "strategy" TEXT NOT NULL DEFAULT 'fallback',
ADD COLUMN     "triggerSource" TEXT;
