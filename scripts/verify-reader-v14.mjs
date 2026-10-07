import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  {
    file: "src/components/reader/pdf-flip-reader.tsx",
    must: ["const READER_BUILD = \"reader-v14\"", "pdf3d-book-clip", "data-reader-build={READER_BUILD}"],
    mustNot: ["cleanupTemporaryCopies", "host.querySelectorAll<HTMLElement>(\".stf__item\")"]
  },
  {
    file: "scripts/local_reader_ai.py",
    must: ["WORKER_BUILD = \"reader-ai-v14.1-tokenizer-batch\"", '"tokenize": False', "rendered = _render_chat_prompt", "return tokenizer([rendered], return_tensors=\"pt\"", "encoded = _tokenize_rendered_prompt"],
    mustNot: ["encoded = tokenizer(rendered, return_tensors=\"pt\""]
  },
  {
    file: "src/lib/ai/local-reader-process.ts",
    must: ["__smartLibraryLocalReaderAiWorkerV141", "stopping stale v14 worker", "stopping stale pre-v14 worker", "reader-ai-v14.1-tokenizer-batch"]
  }
];

let failed = false;
for (const check of checks) {
  const full = path.join(root, check.file);
  if (!fs.existsSync(full)) {
    console.error(`FAIL missing ${check.file}`);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(full, "utf8");
  for (const marker of check.must) {
    if (!text.includes(marker)) {
      console.error(`FAIL ${check.file}: missing marker ${JSON.stringify(marker)}`);
      failed = true;
    }
  }
  for (const marker of check.mustNot ?? []) {
    if (text.includes(marker)) {
      console.error(`FAIL ${check.file}: stale code still present ${JSON.stringify(marker)}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log("PASS reader-v14 source markers are installed.");
console.log("Next: fully stop the dev server, remove .next, stop any stale local_reader_ai.py worker, then start npm run dev again.");
