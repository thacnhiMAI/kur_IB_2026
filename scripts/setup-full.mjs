import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function getNpmInvocation(args) {
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", npmCommand, ...args]
    };
  }

  return {
    command: npmCommand,
    args
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    ...options
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runQuiet(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    shell: false,
    ...options
  });
}

function runNpm(args, options = {}) {
  const invocation = getNpmInvocation(args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    ...options
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasGeneratedPrismaClient() {
  const prismaClientDir = path.join(projectRoot, "node_modules", ".prisma", "client");
  const clientEntrypoints = ["client.js", "default.js", "index.js"];

  return fs.existsSync(prismaClientDir) && clientEntrypoints.some((file) => fs.existsSync(path.join(prismaClientDir, file)));
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, "127.0.0.1");
  });
}

function ensureEnvFile() {
  const envPath = path.join(projectRoot, ".env");
  const envExamplePath = path.join(projectRoot, ".env.example");

  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log("Created .env from .env.example");
  }
}

function ensureDockerIsRunning() {
  const result = runQuiet("docker", ["info"]);

  if (result.status !== 0) {
    console.error("Docker Desktop is not running. Please start Docker Desktop and retry `npm run setup`.");
    if (result.stderr) {
      console.error(result.stderr.trim());
    }
    process.exit(1);
  }
}

async function waitForPostgresHealth(maxAttempts = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = runQuiet("docker", [
      "inspect",
      "--format",
      "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}",
      "smart-library-postgres"
    ]);

    const status = (result.stdout ?? "").trim();
    if (result.status === 0 && (status === "healthy" || status === "running")) {
      console.log(`PostgreSQL container is ${status}`);
      return;
    }

    console.log(`Waiting for PostgreSQL... (${attempt}/${maxAttempts})`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  console.error("PostgreSQL did not become ready in time.");
  process.exit(1);
}

function startDevServer() {
  const invocation = getNpmInvocation(["run", "dev"]);
  const child = spawn(invocation.command, invocation.args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

async function main() {
  ensureEnvFile();
  ensureDockerIsRunning();
  const devServerRunning = await isPortInUse(3000);

  console.log("Starting PostgreSQL container...");
  run("docker", ["compose", "up", "-d", "postgres"]);

  await waitForPostgresHealth();

  if (hasGeneratedPrismaClient()) {
    console.log("Prisma client already exists, skipping regenerate.");
  } else {
    console.log("Generating Prisma client...");
    runNpm(["run", "db:generate"]);
  }

  console.log("Applying Prisma migrations...");
  runNpm(["run", "db:deploy"]);

  console.log("Seeding demo data...");
  runNpm(["run", "db:seed"]);

  if (devServerRunning) {
    console.log("Next.js dev server is already running at http://localhost:3000");
    return;
  }

  console.log("Starting Next.js dev server at http://localhost:3000");
  startDevServer();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
