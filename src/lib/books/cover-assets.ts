import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const DEFAULT_OUTPUT_WIDTH = 800;
const DEFAULT_OUTPUT_QUALITY = 86;

export type CacheCoverAssetInput = {
  slug: string;
  identifier: string;
  url: string;
  maxWidth?: number;
  quality?: number;
};

export type CacheCoverAssetFromBufferInput = {
  slug: string;
  identifier: string;
  buffer: Buffer;
  maxWidth?: number;
  quality?: number;
};

export type CachedCoverAsset = {
  cachedPath: string;
  publicUrl: string;
  width: number | null;
  height: number | null;
  dominantColor: string | null;
  blurDataUrl: string | null;
};

function getCoversDir() {
  return path.join(process.cwd(), "public", "covers");
}

function sanitizePathSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildCoverFileName(slug: string, identifier: string) {
  return `${sanitizePathSegment(slug)}-${sanitizePathSegment(identifier)}.jpg`;
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

async function buildBlurDataUrl(imageBuffer: Buffer) {
  const blurBuffer = await sharp(imageBuffer)
    .resize({ width: 24, withoutEnlargement: true })
    .jpeg({ quality: 50 })
    .toBuffer();

  return `data:image/jpeg;base64,${blurBuffer.toString("base64")}`;
}

export function buildCoverStoragePath(slug: string, identifier: string) {
  return path.posix.join("public", "covers", buildCoverFileName(slug, identifier));
}

export function buildCoverPublicUrl(slug: string, identifier: string) {
  return path.posix.join("/covers", buildCoverFileName(slug, identifier));
}

export function normalizeDominantColor(color: string) {
  const trimmed = color.trim();

  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase();
  }

  return trimmed.toUpperCase();
}

async function writeProcessedCover(input: {
  slug: string;
  identifier: string;
  sourceBuffer: Buffer;
  maxWidth?: number;
  quality?: number;
}): Promise<CachedCoverAsset> {
  await fs.mkdir(getCoversDir(), { recursive: true });

  const image = sharp(input.sourceBuffer);
  const stats = await image.stats();
  const outputRelativePath = buildCoverStoragePath(input.slug, input.identifier);
  const outputAbsolutePath = path.join(process.cwd(), outputRelativePath);
  const { data, info } = await image
    .resize({
      width: input.maxWidth ?? DEFAULT_OUTPUT_WIDTH,
      withoutEnlargement: true
    })
    .jpeg({
      quality: input.quality ?? DEFAULT_OUTPUT_QUALITY,
      mozjpeg: true
    })
    .toBuffer({ resolveWithObject: true });

  await fs.writeFile(outputAbsolutePath, data);

  const dominantColor = normalizeDominantColor(
    rgbToHex(stats.dominant.r, stats.dominant.g, stats.dominant.b)
  );

  return {
    cachedPath: outputRelativePath,
    publicUrl: buildCoverPublicUrl(input.slug, input.identifier),
    width: info.width ?? null,
    height: info.height ?? null,
    dominantColor,
    blurDataUrl: await buildBlurDataUrl(data)
  };
}

export async function cacheCoverAsset(input: CacheCoverAssetInput): Promise<CachedCoverAsset> {
  const response = await fetch(input.url);
  if (!response.ok) {
    throw new Error(`Cover download failed: ${response.status}`);
  }

  return writeProcessedCover({
    slug: input.slug,
    identifier: input.identifier,
    sourceBuffer: Buffer.from(await response.arrayBuffer()),
    maxWidth: input.maxWidth,
    quality: input.quality
  });
}

export async function cacheCoverAssetFromBuffer(
  input: CacheCoverAssetFromBufferInput
): Promise<CachedCoverAsset> {
  return writeProcessedCover({
    slug: input.slug,
    identifier: input.identifier,
    sourceBuffer: input.buffer,
    maxWidth: input.maxWidth,
    quality: input.quality
  });
}
