import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

export const cliModelId = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/);
const cacheSchema = z.object({
  models: z.array(z.object({
    slug: cliModelId,
    visibility: z.string().optional(),
    display_name: z.string().max(100).optional(),
    description: z.string().max(500).optional()
  }))
});

export function cachedCodexModels() {
  try {
    const path = join(process.env.CODEX_HOME || join(homedir(), ".codex"), "models_cache.json");
    return cacheSchema.parse(JSON.parse(readFileSync(path, "utf8"))).models
      .filter(model => model.visibility === "list" && model.slug !== "default");
  } catch {
    return [];
  }
}
