// Remove impossible Google -> reader@example.com links left by implicit linking.
// Preview by default. Use --apply only after checking the preview.
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: ".env.local" });
dotenv.config();
const db = new PrismaClient();
try {
  const demo = await db.user.findUnique({ where: { email: "reader@example.com" } });
  if (!demo) {
    console.log("No reader@example.com user. Nothing to repair.");
  } else {
    const links = await db.account.findMany({
      where: { userId: demo.id, provider: "google" },
      select: { id: true, provider: true, providerAccountId: true }
    });
    console.log(JSON.stringify({ email: demo.email, links }, null, 2));
    if (!process.argv.includes("--apply")) {
      console.log("Preview only. To remove these Google links: node scripts/repair-google-demo-link.mjs --apply");
    } else if (links.length) {
      const result = await db.$transaction(async (tx) => {
        const deleted = await tx.account.deleteMany({
          where: { id: { in: links.map((link) => link.id) }, userId: demo.id, provider: "google" }
        });
        if (deleted.count) {
          await tx.user.update({ where: { id: demo.id }, data: { authVersion: { increment: 1 } } });
          await tx.session.deleteMany({ where: { userId: demo.id } });
        }
        return deleted.count;
      });
      console.log(`Removed ${result} Google link(s). Kept the user, password, books, notes, and history.`);
    }
  }
} finally {
  await db.$disconnect();
}
