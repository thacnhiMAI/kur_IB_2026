import { spawn } from "node:child_process";

const count = Number(process.env.AGENT_WORKER_COUNT || 2);
if (!Number.isInteger(count) || count < 1 || count > 16) throw new Error("AGENT_WORKER_COUNT must be between 1 and 16.");

const workers = new Set();
let stopping = false;

function stop() {
  stopping = true;
  for (const worker of workers) worker.kill();
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
for (let index = 0; index < count; index++) {
  const worker = spawn(process.execPath, ["--import", "tsx", "scripts/local-agent.ts", "--headless"], {
    env: process.env,
    stdio: ["ignore", "inherit", "inherit"],
    windowsHide: true
  });
  workers.add(worker);
  worker.on("error", (error) => { console.error(error.message); process.exitCode = 1; stop(); });
  worker.on("exit", (code) => {
    workers.delete(worker);
    if (!stopping) { process.exitCode = code || 1; stop(); }
  });
}
console.log(`Started ${count} headless Agent Studio workers.`);
