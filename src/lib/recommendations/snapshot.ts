import { createHash } from "node:crypto";

import { db } from "@/lib/db";
import type { RecommendationResult } from "@/lib/recommendations/types";

export function createRecommendationContextHash(input: unknown) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

type SnapshotWriteInput = {
  userId: string;
  provider: string;
  strategy: "fallback" | "ai-enriched";
  status: "ready" | "enriching" | "failed";
  triggerSource: string;
  contextHash: string;
  result: RecommendationResult;
};

function toSnapshotItems(result: RecommendationResult) {
  return result.items.map((item, index) => ({
    bookId: item.bookId,
    reason: item.reason,
    badge: item.badge,
    score: item.score,
    position: index + 1
  }));
}

export async function createRecommendationSnapshot(input: SnapshotWriteInput) {
  return db.recommendationSnapshot.create({
    data: {
      userId: input.userId,
      provider: input.provider,
      strategy: input.strategy,
      status: input.status,
      triggerSource: input.triggerSource,
      contextHash: input.contextHash,
      summary: input.result.summary,
      insights: input.result.insights,
      items: {
        create: toSnapshotItems(input.result)
      }
    },
    include: {
      items: {
        include: { book: true },
        orderBy: { position: "asc" }
      }
    }
  });
}

export async function updateRecommendationSnapshot(
  snapshotId: string,
  input: {
    provider: string;
    strategy?: "fallback" | "ai-enriched";
    status: "ready" | "enriching" | "failed";
    result?: RecommendationResult;
  }
) {
  return db.recommendationSnapshot.update({
    where: { id: snapshotId },
    data: {
      provider: input.provider,
      strategy: input.strategy,
      status: input.status,
      summary: input.result?.summary,
      insights: input.result?.insights,
      items: input.result
        ? {
            deleteMany: {},
            create: toSnapshotItems(input.result)
          }
        : undefined
    },
    include: {
      items: {
        include: { book: true },
        orderBy: { position: "asc" }
      }
    }
  });
}

export async function getLatestRecommendationSnapshot(userId: string) {
  return db.recommendationSnapshot.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          book: {
            include: {
              authors: { include: { author: true } },
              coverAssets: {
                orderBy: { lastFetchedAt: "desc" },
                take: 1
              }
            }
          }
        }
      }
    }
  });
}
