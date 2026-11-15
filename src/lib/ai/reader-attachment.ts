import { z } from "zod";
import { MAX_PAGE_IMAGE_BYTES } from "@/lib/reading/page-image";

export const IMAGE_JOB_PREFIX = "reader-image-v1:";
export const readerAttachment = z.object({
  mime: z.enum(["image/png", "image/jpeg"]),
  base64: z.string().min(4).max(Math.ceil(MAX_PAGE_IMAGE_BYTES / 3) * 4)
});

export type ReaderAttachment = z.infer<typeof readerAttachment>;

export function decodeReaderAttachment(attachment: ReaderAttachment) {
  const bytes = Buffer.from(attachment.base64, "base64");
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (bytes.length > MAX_PAGE_IMAGE_BYTES || !(attachment.mime === "image/png" ? png : jpeg)) {
    throw new Error("Invalid Reader image attachment");
  }
  return bytes;
}
