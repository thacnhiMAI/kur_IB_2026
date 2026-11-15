import { createInterface } from "node:readline";
import { readCodexEvent } from "./codex-exec-events";
import { execFile } from "node:child_process";
import { mkdtemp, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { decodeReaderAttachment, type ReaderAttachment } from "../src/lib/ai/reader-attachment";
import type { complete } from "../src/lib/ai/chat-models";

export const cliComplete: typeof complete = (model, messages, options) => runCodex(model, messages, options);

export async function runCodex(
  model: Parameters<typeof complete>[0],
  messages: Parameters<typeof complete>[1],
  options: NonNullable<Parameters<typeof complete>[2]> = {},
  attachment?: ReaderAttachment
) {
  const modelId = model.model.startsWith("codex:") ? model.model.slice("codex:".length) : "default";
  const args = ["-a", "never", "exec", "--ignore-user-config", "--ignore-rules", "--ephemeral", "--json", "-c", 'model_reasoning_summary="concise"',
    "--sandbox", "read-only", "--skip-git-repo-check", "--disable", "shell_tool",
    "--disable", "hooks", "--disable", "plugins", "--disable", "multi_agent",
    "-c", 'web_search="disabled"', ...(modelId !== "default" ? ["--model", modelId] : [])];
  const executable = process.env.AGENT_CLI_PATH?.trim() || (process.platform === "win32" ? "codex.exe" : "codex");
  const cwd = await mkdtemp(join(tmpdir(), "library-reader-"));
  const allowedEnv = /^(path|pathext|systemroot|windir|userprofile|home|appdata|localappdata|programdata|temp|tmp|codex_home|lang)$/i;
  const env: NodeJS.ProcessEnv = { NODE_ENV: "production", ...Object.fromEntries(Object.entries(process.env).filter(([key]) => allowedEnv.test(key))) };
  const prompt = messages.map(message => message.role + ": " + message.content).join("\n\n") +
    "\n\nReturn only the requested content. Maximum estimated output tokens: " + (options.maxTokens ?? 1200);
  const imagePath = attachment ? join(cwd, attachment.mime === "image/png" ? "reader-image.png" : "reader-image.jpg") : undefined;
  try {
    options.signal?.throwIfAborted();
    if (imagePath && attachment) {
      await writeFile(imagePath, decodeReaderAttachment(attachment), { flag: "wx" });
      args.push("--image", imagePath);
    }
    args.push("-");
    let answer = "";
    let usage: { prompt_tokens: number; completion_tokens: number } | null = null;
    const modelIdReported = await new Promise<string | undefined>((resolve, reject) => {
      const child = execFile(executable, args, {
        cwd, env, windowsHide: true, maxBuffer: 512_000, signal: options.signal
      }, (error, _stdout, stderr) => error ? reject(new Error(error.code === "ENOENT"
        ? "Codex CLI executable not found. Check PATH or AGENT_CLI_PATH."
        : error.killed ? "Codex CLI timed out." : "Codex CLI failed. Check codex login status.")) : resolve(/^model:\s*([a-z0-9._-]+)[ \t]*$/im.exec(stderr)?.[1]));
      if (child.stdout) {
        createInterface({ input: child.stdout, crlfDelay: Infinity }).on("line", (line) => {
          const event = readCodexEvent(line);
          if (event?.type === "reasoning") options.onReasoningSummary?.(event.text);
          else if (event?.type === "agent_message") answer = event.text;
          else if (event?.type === "usage") usage = event.usage;
        });
      }
      child.stdin?.on("error", () => undefined);
      child.stdin?.end(prompt, "utf8");
    });
    return { content: z.string().trim().min(1).max(16000).parse(answer), usage, servedModel: modelIdReported ? "codex:" + modelIdReported : model.model };
  } finally {
    if (imagePath) await unlink(imagePath).catch(() => undefined);
    await rmdir(cwd).catch(() => undefined);
  }
}
