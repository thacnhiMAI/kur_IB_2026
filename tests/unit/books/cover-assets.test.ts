import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildCoverStoragePath,
  cacheCoverAsset,
  normalizeDominantColor
} from "@/lib/books/cover-assets";

const originalCwd = process.cwd();

describe("cover asset helpers", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cover-assets-"));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("creates deterministic storage paths and css-safe colors", () => {
    expect(buildCoverStoragePath("dune", "9780441172719")).toBe(
      "public/covers/dune-9780441172719.jpg"
    );
    expect(normalizeDominantColor("#abc")).toBe("#AABBCC");
  });

  it("downloads, caches, and annotates a cover asset", async () => {
    const sourceImage = await sharp({
      create: {
        width: 12,
        height: 18,
        channels: 3,
        background: "#336699"
      }
    })
      .png()
      .toBuffer();

    const fetchMock = vi.fn(async () => new Response(sourceImage, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const asset = await cacheCoverAsset({
      slug: "dune",
      identifier: "9780441172719",
      url: "https://example.com/dune.png"
    });

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/dune.png");
    expect(asset).toMatchObject({
      cachedPath: "public/covers/dune-9780441172719.jpg",
      publicUrl: "/covers/dune-9780441172719.jpg",
      width: 12,
      height: 18
    });
    expect(asset.dominantColor).toMatch(/^#[0-9A-F]{6}$/);
    expect(asset.blurDataUrl).toMatch(/^data:image\/jpeg;base64,/);
    await expect(fs.access(path.join(tempDir, asset.cachedPath))).resolves.toBeUndefined();
  });
});
