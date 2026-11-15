import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const port = "3000";
const authUrl = "http://localhost:" + port;
const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const child = spawn(process.execPath, [next, "dev", "-H", host, "-p", port], {
  stdio: "inherit",
  env: { ...process.env, READER_AGENT_QUEUE: "1", AGENT_LOCAL_QUEUE: "1", AUTH_URL: authUrl, NEXTAUTH_URL: authUrl }
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => { process.exitCode = code ?? 1; });
