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
   local worker: severity, suspected attack type, indicators, an attack
   timeline, and recommended actions.
5. **Manages deployment** of the model artifact across all three
   environments, including simulating the air-gap transfer pipeline
   (signed artifact → security verification → manual transfer → air-gap
   import → checksum verification → deployment).
6. **Logs every decision** to an audit trail with its justification.

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run the test suite (59 tests covering classification, routing, analysis,
timelines, worker dispatch, the orchestrator, and Route Handlers):

```bash
npm test
```

Production build (also runs the TypeScript check):

```bash
npm run build
npm start
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

## Architecture

```
Next.js dashboard (client components)
        ↓ fetch
Next.js Route Handlers  — src/app/api/*
        ↓
Classification engine   — src/features/sentinel/classification/
        ↓
Policy engine           — src/features/sentinel/routing/
        ↓
In-memory job store     — src/features/sentinel/server/sentinel-store.ts
        ↓
Worker dispatcher       — src/features/sentinel/workers/
        ↓
Environment workers     — Cloud / On-Prem / Air-Gapped (local simulation)

The in-memory store owns environment capacity, workload history, the audit
trail, and model artifact state.
```

| Concern | Where |
|---|---|
| Classification engine (detects PII, internal IPs, credentials, classification markers, external-network requests) | `src/features/sentinel/classification/classify-content.ts` |
| Policy config (classification → allowed environments, network-mode ranking) | `src/features/sentinel/routing/policy-config.ts` |
| Routing/eligibility evaluation | `src/features/sentinel/routing/evaluate-routing.ts` |
| Incident analysis + attack timeline generation | `src/features/sentinel/analysis/` |
| Orchestrator: capacity allocation/release, workload completion, quarantine, audit trail, model deployment state | `src/features/sentinel/server/sentinel-store.ts` |
| Worker registry + environment-specific deterministic execution | `src/features/sentinel/workers/` |
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
- **The three environments are simulated in-process**, not three real
  deployments. Their workers are local abstractions, and capacity,
  online/offline state, and network mode are modeled data rather than real
  infrastructure.
- **State is in-memory** and resets when the server restarts. A durable
  store (Postgres/SQLite) is the natural next step, not implemented here.
- **The model artifact and its SHA256 are illustrative**, not a hash of
  any real build output.

All incident data, IP addresses, and hostnames used in fixtures and demo
scenarios are synthetic.

## Tech stack

Next.js 16 (App Router, Route Handlers) · React 19 · TypeScript ·
Tailwind CSS · Vitest.
