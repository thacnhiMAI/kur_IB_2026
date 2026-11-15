# Agent Studio for Windows

Run `npm ci` once, then `npm run agent:local` from the project folder
with Node.js 24 and Windows PowerShell. Agent Studio opens as a native
Windows window. Its model runner runs locally as a child process.

Enter a text task, select a limit of zero to six subagents, and click Run.
The graph shows planning, parallel workers, and the final response. Select a node
to see its model, status, output, and available usage. Cancel stops the active run.
The visualizer retains the latest run in memory until you start another or close the app.

Optional external provider keys belong in `.env.local`. Model IDs and rates belong in `agent-models.json`.

The coordinator and visualizer run locally. The selected model provider receives
the text it needs to process each step. Agents handle text tasks. They do not
edit files, execute commands, or browse.

## Connect Vercel Reader to Agent Studio

1. Deploy the application and apply migration `20261113_agent_queue` to its database.
   The existing production build script applies Prisma migrations.
2. Set `READER_AGENT_QUEUE=1` and `AGENT_WORKER_SECRET` on Vercel production.
   Generate the shared secret in a secure secret manager using at least 32 random bytes.
3. In the desktop project's `.env.local`, set `AGENT_WORKER_URL=https://kur-ib-2026.vercel.app`
   and the same `AGENT_WORKER_SECRET`. Sign in to Codex CLI locally.
4. Restart Agent Studio. Submit a short text request in Reader. It should appear in the
   desktop visualizer with source **Vercel** and return to the requesting Reader session.

The integration covers signed-in Reader text requests. OCR, page images, and recommendations
retain their existing routes. The worker claims queued jobs in arrival order and runs up to the number selected in Parallel requests. Subagent limit applies separately per request. The queue allows 100 active jobs by default, including multiple jobs from the same account. A lost worker lease permits one retry. The worker's lease token
prevents an expired attempt from overwriting a result. The desktop validates response shape
and length, and Vercel checks the same fields before returning the result. This validation
cannot guarantee factual accuracy.

Vercel stores prompts transiently in PostgreSQL and sends only task material, title and bounded
conversation context to the worker. It does not include account identity in the worker payload.
Normally the queue row is deleted after response, cancellation or timeout. If a web invocation
stops unexpectedly, expired rows are ignored by workers and removed on the next admission.
Existing Reader conversation storage applies after a response is accepted. Keep the desktop
worker running during use. Queued jobs expire after 10 minutes if no worker claims them.

## Use Reader in Codex or Claude Code

Copy the entire `skills/library-reader` folder to one of these locations:

| Client | Project install | User install |
| --- | --- | --- |
| Codex | `.agents/skills/` | `~/.agents/skills/` |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |

Open a new session. In Codex, invoke `$library-reader`. In Claude Code, invoke
`/library-reader`. Paste the text and your task into the same session.

Sample task: "Summarize the excerpt in one sentence and create two review
questions. Excerpt: A database index can speed up searches, but maintaining
it adds overhead when rows are inserted or updated."

The client uses its current account and model configuration. This workflow
requires no Agent Studio or AI Gateway credentials. It handles material
submitted in chat and does not consume the website queue or return results
to the website. The skill's scope instructions do not change the client's
tool permissions.

## Agent Studio model selection

Agent Studio uses Codex CLI for planning. Set `AGENT_ENGINE=codex` in
`.env.local` and start with `npm run agent:local`. Sign in to Codex CLI once.
The worker supplies both Reader skills on each new request.

Edit `agent-models.json` in the project root:

- `planner` is a Codex CLI model ID. With `"default"`, the worker omits
  `--model` and lets the signed-in CLI select its default. The worker ignores
  user config for these sessions, so an interactive session's model setting
  does not control Agent Studio.
- `codex` lists optional CLI model IDs and their difficulty levels.
  Example entry: `{"model":"YOUR_CODEX_MODEL_ID","level":"complex"}`.
  Use IDs supported by your CLI account. The worker passes the selected ID
  with `--model`, without opening an interactive CLI.
- `api` lists optional external models. Example entry:
  `{"provider":"google","model":"YOUR_MODEL_ID","level":"standard","input":0.1,"output":0.4}`.
  Replace the illustrative rates with USD per million tokens. Keep provider
  keys in `.env.local`. Entries without credentials are omitted.

The coordinator classifies the request, proposes models for independent
subtasks and the final response, and workers execute the validated assignments.
Codex default remains available even when the catalog is empty.

## Test Reader and Agent Studio on the same PC

Use a development PostgreSQL database and apply the checked-in migrations
with `npm run db:deploy` against that database. Keep the shared
`AGENT_WORKER_SECRET` in `.env.local` for both processes.

1. Run `npm run dev:agent` to start Next.js on `http://127.0.0.1:3000`
   with the Reader queue enabled for that process.
2. Run `npm run agent:local-site` in another terminal. This worker polls
   the local address for this session. `npm run agent:local` still uses
   `AGENT_WORKER_URL` from your configuration.
3. Open `http://localhost:3000` in your browser. Google OAuth uses this hostname.
   Sign in and submit a text request in Reader. Watch for
   the request in Agent Studio.

Local HTTP is accepted only for the literal loopback addresses `127.0.0.1`
and `[::1]`. Use HTTPS for remote worker URLs.

### Choose a model in Agent Studio

The Model menu loads visible entries from the Codex CLI model cache and any
extra entries configured in `agent-models.json`. The reload button rereads both.
Auto uses all visible models in the Codex CLI cache for routing subtasks and the
final response, even with an empty catalog file. Configured CLI entries can
add models or override their difficulty level. Choosing a Codex model applies it to
the next run, including Reader image requests. Choosing an API model applies
it to text work and synthesis while Codex handles planning and image requests.
Desk details show the selected model and the reported model if it differs.
The CLI default entry leaves model selection to the CLI.

## Usage and capacity

Each account has independent 5-hour and 7-day Reader budgets. Set
`READER_AI_5H_BUDGET` and `READER_AI_WEEKLY_BUDGET` on the server to override
the defaults (120000 and 650000 units). Both windows start on the first
accepted request after the previous window ends. Admission reserves an
estimate in both windows. On completion it is replaced by measured usage
where available, or an estimate where the backend did not report tokens.
The project uses input tokens plus twice output tokens, with weights of 2
for Astra and 0.5 for Luna. These are project units, separate from the
operator's Codex subscription or provider billing. OCR and recommendations
have separate execution paths.

Agent Studio caps simultaneously running requests with **Parallel requests**
and caps actual model subprocesses and API calls across all jobs with
`AGENT_MODEL_CONCURRENCY` (default 12, range 1-64). Increase those limits
only after measuring host memory, latency and provider throttling. The
database prioritizes accounts with fewer in-flight jobs, using FIFO for ties.

For a site with 5,000 accounts, size for peak requests per minute rather
than account count. Estimate model call capacity from peak requests/second
× average model calls/request × average seconds/call, then leave headroom
for spikes. Reader submits jobs asynchronously and waits through the status endpoint. Before enabling public traffic at scale, run the worker pool on independently hosted machines with health checks, and use provider accounts sized for the measured throughput. Load-test
with a fake model, then measure p95 wait time, completion time, and provider
rate-limit errors under a controlled real workload.

## Background Reader jobs and multiple workers

With the Reader queue enabled, submission returns HTTP 202 and the browser
polls with backoff for job status. A worker renews its lease while a job is
running, then writes the answer, conversation history and usage settlement
in one transaction. Only the job owner can view or cancel it. The queue
admits up to 100 jobs by default. Set `READER_QUEUE_CAPACITY` on the server
to change this (1–500). Completed result rows are retained for 30 minutes
and cleaned up on subsequent admissions. The Reader conversation retains
completed answers.

Agent Studio launches two local worker processes by default. Set
`AGENT_STUDIO_WORKERS` (1–4) to change this. The request and model limits are
split between those processes, and their activity appears in one window.
Each robot's count includes its running steps across displayed and
background runs. Steps waiting for a model slot are marked queued.

For separate headless workers, use `npm run agent:workers`.
`AGENT_WORKER_COUNT` controls the number of processes, and
`AGENT_PARALLEL_REQUESTS` controls request slots per process. Set
`AGENT_WORKER_URL` to your Reader server and sign in to Codex on each host.
Headless workers on other machines share the queue. Their logs do not
feed a separate desktop window.

Run the local database load test with:
`npm run test:agent-load -- --rpm 120 --seconds 20 --workers 12 --delay 5000`.
Use the site's measured peak RPM and latency samples for capacity planning.
The test uses an isolated PostgreSQL schema, the worker claim/finish route,
and a simulated model delay.
