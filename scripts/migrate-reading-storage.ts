import "dotenv/config";

import { copyFile, mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const legacyRoot = path.resolve(process.cwd(), "public", "reading");
const privateRoot = path.resolve(process.cwd(), "storage", "reading");

function isPathInside(basePath: string, targetPath: string) {
  const relative = path.relative(basePath, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function exists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function moveFileSafely(source: string, destination: string) {
  try {
    await rename(source, destination);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code !== "EXDEV") {
      throw error;
    }

    await copyFile(source, destination);
    await unlink(source);
  }
}

async function main() {
  await mkdir(privateRoot, { recursive: true });

  const contents = await prisma.bookContent.findMany({
    where: {
      sourceType: "PDF",
      storagePath: {
        not: null
      }
    },
    select: {
      id: true,
      storagePath: true,
      publicUrl: true,
      fileName: true
    }
  });

  let migrated = 0;
  let normalized = 0;
  let skipped = 0;

  for (const content of contents) {
    if (!content.storagePath) {
      continue;
    }

    const currentPath = path.resolve(content.storagePath);

    if (isPathInside(privateRoot, currentPath)) {
      if (content.publicUrl) {
        await prisma.bookContent.update({
          where: { id: content.id },
          data: { publicUrl: null }
        });
        normalized += 1;
      }
      continue;
    }

    if (!isPathInside(legacyRoot, currentPath)) {
      console.warn(`Skipping ${content.id}: storage path is outside managed reading directories.`);
      skipped += 1;
      continue;
    }

    const fileName = content.fileName || path.basename(currentPath);
    const destination = path.join(privateRoot, fileName);
    const sourceExists = await exists(currentPath);
    const destinationExists = await exists(destination);

    if (sourceExists && !destinationExists) {
      await moveFileSafely(currentPath, destination);
    } else if (sourceExists && destinationExists) {
      await unlink(currentPath);
    } else if (!destinationExists) {
      console.warn(`Skipping ${content.id}: PDF file not found at ${currentPath}.`);
      skipped += 1;
      continue;
    }

    await prisma.bookContent.update({
      where: { id: content.id },
      data: {
        storagePath: destination,
        publicUrl: null
      }
    });
    migrated += 1;
  }

  console.log({ migrated, normalized, skipped });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
