# Job Cracker

A self-hosted platform for a 30-day Senior/Lead Backend interview sprint: study, test yourself
under time, and track whether you are actually getting better.

Built around the material in this repo (phases 1–5), for the Node.js / NestJS / AWS market in
Bangladesh and international remote.

---

## Run it

```bash
cd job-cracker
cp .env.example .env      # only needed if a port clashes
make up                   # or: docker compose up -d --build
```

Open **http://localhost:8080**.

| Command | Does |
|---|---|
| `make up` | Build and start everything |
| `make logs` | Tail all container logs |
| `make down` | Stop containers, keep your data |
| `make reseed` | Re-import content after editing it (progress is preserved) |
| `make psql` | Open a psql shell |
| `make clean` | **Destroy the database volume** — you lose all progress |

Ports are configurable in `.env` (`WEB_PORT`, `API_PORT`, `DB_PORT`) if `8080`/`4000`/`55432`
are taken on your machine.

---

## What is in it

| Tab | What it does |
|---|---|
| **Today** | The current day of the plan, its tasks, and the hiring-manager note explaining why the day exists |
| **30-day plan** | All 30 days, 163 tasks, each linked to the guide in this repo it draws on |
| **Library** | All 59 markdown guides in the repo, readable in the app — full-text search, per-document table of contents, syntax highlighting, and working cross-links between guides |
| **Practice** | 101 coding problems with real test cases, run in your browser. Timed / weak-pattern / blind / spaced-review session modes |
| **Quiz** | 136 rapid-recall questions across 21 topics, scored server-side with explanations |
| **Design** | 18 timed design drills (12 HLD, 4 LLD, 2 architecture) with weighted rubrics you score yourself against |
| **Behavioral** | STAR story bank with 14 prompts, each carrying "what good looks like" and "red flags" |
| **Skills** | 32 skills rated against market demand; gap = `(demand − level) × demand` |
| **Pipeline** | Application tracker with funnel conversion rates |
| **Progress** | Readiness score, pattern mastery, daily output, weak-topic charts |
| **Market analysis** | Where you get cut in the funnel, comp bands, channel strategy |
| **Playbook** | Resume, LinkedIn, applications, negotiation scripts, interview logistics |

### The readiness score

Weighted by where the funnel actually removes people, not by what is easiest to measure:

```
readiness = 0.30 · coding    (the online assessment is the biggest single gate)
          + 0.25 · design    (decides senior vs lead)
          + 0.15 · recall    (deep-dive rounds)
          + 0.15 · narrative (behavioral / bar raiser)
          + 0.15 · adherence (consistency compounds)
```

Recall and design are scaled by volume, so a single lucky quiz cannot inflate the number.
It is a coaching signal, not a prediction.

---

## Architecture

```
                   :8080                      :4000               :5432
   browser  ──▶  web (node)  ──/api/──▶   api (NestJS)  ──▶  db (postgres 16)
                  │                           │      │
                  └── React SPA               │      └── ../  mounted read-only
                      + Web Worker            │          (the Library reads it)
                        (runs your code)      └── Prisma · content seeded at boot
```

- **`api/`** — NestJS + Prisma. Content lives as typed TypeScript modules in `api/src/content/`
  and is imported into Postgres idempotently on boot. Your progress lives in separate tables
  and is never touched by re-seeding.
- **`web/`** — React + Vite + Tailwind. Served by `web/server.mjs`, a ~110-line dependency-free
  Node server that handles static files, gzip, SPA fallback and the `/api` proxy. It runs on the
  same `node:20-alpine` base as the build stage, so the entire stack needs only two base images
  (node and postgres) — no nginx pull required.
- **The repo is mounted read-only at `/repo`** so the Library can serve the guides. Every
  client-supplied path is resolved (and re-resolved through `realpath`, to defeat symlinks) and
  rejected unless it sits inside that root and ends in `.md`.
- **Your code never runs on the server.** Submissions execute in a browser Web Worker with an
  8-second wall-clock limit enforced by terminating the worker. No server-side `eval`, no
  container escape surface.

### Reading long guides

The biggest guide is 192 KB / 49 sections. Handing that to a markdown renderer in one piece
janks the main thread, so the API splits each document at `## ` boundaries (ignoring `##` inside
fenced code) and the reader streams sections in during idle time — first paint in ~200 ms, fully
rendered in under a second. Everything ends up in the DOM, so browser find-in-page still works.

Anchor ids come from `rehype-slug` at render time and the table of contents reads them back off
the DOM. That is deliberate: an earlier version computed slugs on the server and they silently
disagreed with the renderer (`20-layered--hexagonal-business-service` vs
`20-layered-hexagonal-business-service`), which broke every jump link.

### The test harness

`api/src/common/harness.ts` and `web/src/lib/harness.ts` are the same file. It supports four
test modes so problems can be posed the way a real assessment poses them:

- `call` — plain function invocation, with `argTypes` that build real `ListNode` / `TreeNode` /
  cyclic-list / graph structures from array notation before calling you
- `ops` — construct a class, then replay a method sequence (LRU cache, min stack, trie)
- `driver` — a bespoke async script exercises your implementation (async pool, debounce,
  event emitter, idempotency store)
- comparison modes: `deep`, `unordered`, `unorderedOuter`, `unorderedNested`, `oneOf`

`npm run validate` in `api/` runs every bundled reference solution against its own tests and
checks that every plan reference resolves to a real drill, quiz topic, problem pattern and
**existing repo file**. **101/101 pass.** That guard is what keeps you from wasting an hour
debugging a correct solution against a wrong expected value, or opening a task that points at
a guide that no longer exists.

It also prints a coverage report — which guides in the repo the plan never sends you to, and
the daily time load (currently 3.4h min, 4.0h median, 4.7h max). Both are advisory, but they
are how the plan stays honest as the repo grows.

---

## Editing the content

All of it is typed TypeScript, so a typo is a compile error rather than a silent data problem:

| File | Holds |
|---|---|
| `api/src/content/plan.ts` | The 30 days and their tasks |
| `api/src/content/problems-*.ts` | The coding bank (core / structures / graphs / dp / node) |
| `api/src/content/quiz.ts` | Recall questions |
| `api/src/content/drills.ts` | Design drills and their rubrics |
| `api/src/content/skills.ts` | Skills matrix and demand weighting |
| `api/src/content/behavioral.ts` | STAR prompts with grading notes |
| `api/src/content/docs.ts` | Market analysis, playbook, how-to |

After editing:

```bash
cd api && npm run validate     # prove nothing broke
cd .. && make reseed           # re-import; your progress survives
```

Bump `CONTENT_VERSION` in `api/src/content/index.ts` if you want the import to run
automatically on the next boot rather than needing `RESEED=true`.

To regenerate the offline copy of the plan at the repo root:

```bash
cd api && npm run export:plan   # writes ../../30-DAY-PLAN.md
```

---

## Local development (without Docker)

```bash
# terminal 1 — database only
docker compose up -d db

# terminal 2 — api
cd api
export DATABASE_URL="postgresql://jobcracker:jobcracker@localhost:55432/jobcracker?schema=public"
npm install && npx prisma db push && npm run start:dev

# terminal 3 — web (proxies /api to :4000)
cd web && npm install && npm run dev
```

---

## Data

Everything lives in the `jc-pgdata` Docker volume. `make down` keeps it; `make clean` destroys it.

To back up before experimenting:

```bash
docker compose exec db pg_dump -U jobcracker jobcracker > backup.sql
```
