# SentinelGrid

**Policy-driven hybrid AI orchestration for government cybersecurity operations.**

## Why this matters

Government AI workloads rarely live in one place: public data can go to
cloud, internal telemetry must stay on-prem, and the most sensitive data
must never leave an air-gapped enclave. SentinelGrid is a control plane
that decides *where* an AI analysis job is allowed to run — cloud, on-prem,
or air-gapped — based on the sensitivity of the data, its network
requirements, and live environment capacity, and enforces that decision
instead of trusting whatever the submitter claims. The same model artifact
is deployed consistently across all three, including the manual transfer
required to reach the air-gapped enclave.

**Who this is for:** a SOC lead or platform team who currently has no
consistent, auditable answer to "was this incident allowed to be analyzed
where it was analyzed?" — today that's an ad-hoc or manual judgment call.
SentinelGrid replaces that with a policy engine that evaluates every job
the same way and leaves an audit trail explaining why.

## What it does

1. **Classifies** the incident — both what the analyst declares and what
   the content actually contains (internal IPs, credentials, PII,
   classification markers, requests for external lookups).
2. **Routes** it to the highest-preference environment that is online, has
   capacity, and is cleared for that classification and network
   requirement — or **blocks** it if none qualify.
3. **Quarantines** it instead of routing, if the declared classification
   is lower than what the content actually contains (e.g. a SECRET-content
   job mislabeled PUBLIC) — an explicit tamper/misclassification check, not
   just "trust the label."
4. **Dispatches and analyzes** routed incidents through an environment-specific
   worker service: severity, suspected attack type, indicators, an attack
   timeline, and recommended actions.
5. **Manages deployment** of the model artifact across all three
   environments, including simulating the air-gap transfer pipeline
   (artifact preparation → SHA-256 computation → transfer package → air-gap
   import → SHA-256 recomputation → checksum match → verified deployment).
6. **Persists every decision** and execution result to SQLite, including the
   audit trail and model deployment state, so control-plane restarts do not
   erase history.

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev:local
```

Open [http://localhost:3000](http://localhost:3000).

`dev:local` explicitly selects the in-process worker transport. It uses the
same worker contracts and deterministic analysis as the service transport,
but does not require Docker.

Run the test suite (90 tests covering classification, routing, analysis,
timelines, local and HTTP worker dispatch, worker service contracts, the
orchestrator, real artifact verification, SQLite restart durability, and Route
Handlers):

```bash
npm test
```

Production build (also runs the TypeScript check):

```bash
npm run build
SENTINEL_WORKER_MODE=local npm start
```

## Docker Compose

Start the control plane and all three worker services:

```bash
docker compose up --build
```

The dashboard is available at [http://localhost:3000](http://localhost:3000).
Cloud and On-Prem health endpoints are exposed for local inspection. The
Air-Gapped endpoint is exposed only inside its internal Compose network:

| Service | Host URL | Responsibility |
|---|---|---|
| Cloud Worker | `http://localhost:4101/health` | Public-compatible execution with `EXTERNAL_CAPABLE` mode |
| On-Prem Worker | `http://localhost:4102/health` | Controlled-network execution with `CONTROLLED_NETWORK` mode |
| Air-Gapped Worker | `http://airgap-worker:4103/health` (internal only) | Local-only deterministic execution with `OFFLINE` mode |

Host ports can be changed with `SENTINELGRID_PORT`, `CLOUD_WORKER_PORT`, and
`ONPREM_WORKER_PORT`; `AIRGAP_WORKER_PORT` changes the isolated worker's
internal port. The control plane discovers workers through
`CLOUD_WORKER_URL`, `ONPREM_WORKER_URL`, and `AIRGAP_WORKER_URL`; Compose
supplies their internal service URLs.

The control plane stores SQLite data at `/app/data/sentinelgrid.sqlite`. Compose
mounts the named volume `sentinelgrid-data` at `/app/data`, so recreating only
the control-plane container retains workloads, audits, and deployment state.
`docker compose down` preserves the volume; `docker compose down -v` removes it.

Stop and remove the prototype containers with:

```bash
docker compose down
```

## Demo walkthrough

Use the **Load demo scenario** dropdown on the incident form, or fill in
your own. These five cover routed, blocked, and quarantined outcomes:

| # | Scenario | Declared classification | Expected result |
|---|---|---|---|
| 1 | Public CVE research | PUBLIC | → **Cloud** |
| 2 | Confidential authentication anomaly | CONFIDENTIAL | → **On-Prem** |
| 3 | Classified enclave telemetry | CLASSIFIED | → **Air-Gapped** |
| 4 | Secret indicator + external lookup request | SECRET | → **Blocked** (air-gapped-only data cannot reach an external service) |
| 5 | Under-classified sensitive content | PUBLIC | → **Quarantined** (content is detected as CLASSIFIED) |

The fifth scenario is declared PUBLIC, but its synthetic content includes
classification markers. It is quarantined before policy routing or worker
dispatch because the detected sensitivity outranks the declared value.

Then open the **SentinelAI deployment** panel and click **Deploy to
Air-Gapped** to watch the artifact carry across the air-gap boundary
through the full transfer pipeline.

Every submission appears in **Recent workloads** (click a row to reopen
its decision) and in the **Session audit log** at the bottom.

## SentinelAI artifact lifecycle

The prototype model artifact is a real local metadata file at
`artifacts/sentinel-ai-1.0.0.json`. It contains deterministic, non-sensitive
metadata only—there are no model weights, binaries, credentials, or API keys.

The control plane reads the actual file bytes and computes SHA-256 with
Node.js `crypto`; the checksum is not hardcoded in application logic. The
deployment panel shows the computed checksum, byte size, source verification,
and verification status for each environment.

Air-Gap transfer remains simulated. During deployment SentinelGrid copies the
source bytes into an imported representation, independently recomputes its
SHA-256, and activates version 1.0.0 only when the source and imported hashes
match. A mismatch leaves the previous Air-Gapped version and activation time
unchanged, marks verification failed, and stops before deployment verification.

Cryptographic signing and trust-chain verification are not implemented yet;
this is still a prototype artifact lifecycle based on checksum integrity.

## Architecture

```
Browser dashboard
       │
       ▼
Next.js control plane :3000
       │ classify → deterministic policy route → allocate capacity
       │
       ├── SQLite → /app/data/sentinelgrid.sqlite
       ├── HTTP → Cloud Worker :4101
       ├── HTTP → On-Prem Worker :4102
       └── HTTP → Air-Gapped Worker :4103
                    (isolated internal Docker network)

Each worker imports the same deterministic analysis and timeline modules.
The control-plane orchestration service coordinates policy and worker calls;
SQLite is the durable source of truth for application state.
```

`SENTINEL_WORKER_MODE=http` selects service dispatch and requires all three
worker URL variables. `SENTINEL_WORKER_MODE=local` selects the in-process
registry used by normal automated tests and optional local development. The
mode is mandatory: a failed HTTP dispatch never falls back to local execution.

Routing remains authoritative and deterministic. If a selected service is
unreachable, times out, rejects the request, or returns a malformed payload,
the workload remains routed to that selected environment but its execution is
recorded as `FAILED`. Capacity is released in all cases, the failure is kept in
workload history, and SentinelGrid does not attempt another environment.

## Local persistence

SentinelGrid uses `better-sqlite3` and a committed, idempotent schema migration.
For local development the database defaults to
`data/sentinelgrid.sqlite`; set `SENTINEL_DB_PATH` to use another location.
Automated tests use isolated in-memory or temporary-file databases and never
write to the developer database.

Durable records include complete incident/workload results, routing decisions,
detected classifications, worker execution/failure metadata, analysis and
timelines, audit entries (including environment evaluations and explanation),
environment capacity configuration, and deployment/checksum state. Structured
objects are serialized as JSON where relational querying is not needed; IDs,
timestamps, outcomes, selected environments, and lifecycle statuses remain
explicit columns.

Worker health is deliberately runtime-only. A new control-plane process starts
with `UNKNOWN` health and refreshes it from live workers. Immediate worker jobs
cannot resume after a restart: any persisted `QUEUED` or `RUNNING` job is marked
`FAILED`, its audit record is retained, and capacity is reconciled to the
configured baseline. Completed and failed jobs therefore never leave phantom
capacity allocated.

`POST /api/reset` clears application records, resets the incident sequence,
environment capacity, and deployments to the prototype baseline, but preserves
the database file, schema/migrations, artifact, and application configuration.

| Concern | Where |
|---|---|
| Classification engine (detects PII, internal IPs, credentials, classification markers, external-network requests) | `src/features/sentinel/classification/classify-content.ts` |
| Policy config (classification → allowed environments, network-mode ranking) | `src/features/sentinel/routing/policy-config.ts` |
| Routing/eligibility evaluation | `src/features/sentinel/routing/evaluate-routing.ts` |
| Incident analysis + attack timeline generation | `src/features/sentinel/analysis/` |
| Artifact loading, byte hashing, manifests, and checksum verification | `src/features/sentinel/artifacts/artifact-service.ts` |
| Orchestrator: capacity allocation/release, workload completion, quarantine, audit trail, model deployment state | `src/features/sentinel/server/sentinel-store.ts` |
| SQLite connection, migration, and repositories | `src/features/sentinel/persistence/` |
| Local/HTTP dispatch, worker registry, health checks, and response validation | `src/features/sentinel/workers/` |
| Standalone worker HTTP service (`GET /health`, `POST /execute`) | `src/features/sentinel/worker-service/` |
| API: `POST/GET /api/incidents`, `GET /api/environments`, `GET /api/audit`, `GET /api/deployment`, `POST /api/deployment/air-gap`, `POST /api/reset` | `src/app/api/` |
| Dashboard UI | `src/features/sentinel/components/` |

## What's simulated vs. real

This is a hackathon-scale prototype of the *orchestration and policy
layer*, not a production SOC platform:

- **Classification is a deterministic rule engine** (regex-based signal
  detection + a ranked policy table), not a trained ML classifier. That's
  a deliberate choice, not a shortcut: policy decisions gating access to
  classified government data need to be auditable and explainable, and a
  rule engine's decision path is fully inspectable — every check and its
  reason is returned with the routing decision.
- **"AI analysis" (severity, attack type, indicators, timeline)** is
  template- and regex-driven against the synthetic sample content, not a
  live LLM call — deterministic and reproducible for demo purposes.
- **The three environments remain simulated.** Docker mode runs their workers
  as separate local containers; local/test mode runs equivalent in-process
  adapters. Capacity, environment availability, and network capabilities are
  still modeled prototype data rather than real infrastructure.
- **The Air-Gapped worker is attached only to an internal Docker network**
  shared with the control plane. This limits its normal Compose egress while
  retaining the channel required for dispatch. This is a logical air-gap
  simulation for the prototype, not a production-grade physical isolation
  boundary.
- **Application state is durable in local SQLite**, but this remains a
  single-control-plane prototype without production backup, replication,
  encryption-at-rest management, or distributed concurrency controls.
- **The model artifact is real metadata, but not a real model package.** Its
  SHA-256 is computed and verified from the actual local bytes. Transfer is
  simulated, and no cryptographic signing infrastructure or external registry
  exists yet.

All incident data, IP addresses, and hostnames used in fixtures and demo
scenarios are synthetic.

## Tech stack

Next.js 16 (App Router, Route Handlers) · React 19 · TypeScript · SQLite
(`better-sqlite3`) · Tailwind CSS · Vitest.
