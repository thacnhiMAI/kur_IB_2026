import { execFileSync } from "node:child_process";

function run(script, env = process.env) {
  execFileSync(process.execPath, [process.env.npm_execpath, "run", script], { env, stdio: "inherit" });
}

run("db:generate");
if (process.env.VERCEL_ENV === "production") {
  run("db:deploy");
  run("db:seed", { ...process.env, SEED_CATALOG_ONLY: "1" });
}
run("build");
