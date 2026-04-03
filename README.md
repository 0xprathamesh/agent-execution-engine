# Agent Execution Engine

Job queue + worker backend. API enqueues jobs; a separate worker process consumes from Redis, runs processors, and syncs state to Postgres. Stuck-job recovery runs inside the worker.

**In-depth architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — processes, data flow, state machine, file map, where to add features.

**Stack:** Node, TypeScript, Express, Prisma (Postgres), BullMQ (Redis).

---

## Run

```bash
cp .env.example .env   # set DATABASE_URL, REDIS_* etc.
npm install
npx prisma migrate dev

npm run start    # API (port 3000)
npm run worker   # Worker + stuck-job recovery (separate process)
```

**API:** `POST /api/v1/job/job` — body: `{ type, payload }`. Types: `AGENT_TASK`, `WEBHOOK`, `GENERIC`.  
**Get job:** `GET /api/v1/job/job/:id`  
**Docs:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs) (Swagger UI)

---

## Phases

| Phase | Scope | Status |
|-------|--------|--------|
| **1** | Basic job queue, basic worker, basic API | ✅ |
| **2** | Workflow DAG engine | 🟨 |
| **3** | Agent brain | ⬜ |
| **4** | Distributed scaling | ⬜ |
| **5** | Observability | ⬜ |
| **6** | Advanced failure handling | ⬜ |

Phase 1 includes: idempotent worker (claim via `setRunningIfQueued`), BullMQ retry/backoff aligned with DB, stuck RUNNING recovery scheduler, job timeout and worker concurrency via env.
