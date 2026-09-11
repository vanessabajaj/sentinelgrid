# SentinelGrid — Hybrid Deployment Orchestrator

A policy-driven router and dashboard that decides, for every AI/security
workload, which of three environments it is allowed to run in — **Cloud**,
**On-Prem**, or an **Air-Gapped** enclave — based on data classification,
network requirements, capacity, and workload type. It also demonstrates how
a single model artifact stays present and verified across all three,
including the manual transfer path into the air-gapped enclave.

## The problem, and who this is for

Government agencies, defense/intelligence contractors, and regulated
enterprises (healthcare, finance, critical infrastructure) increasingly run
AI-assisted workflows — SOC triage, log analysis, threat intelligence — but
their data doesn't all carry the same clearance. Some of it can go to a
public cloud. Some must stay on a controlled internal network. The most
sensitive must never touch a network at all.

Today that routing decision is usually made by hand: an analyst or platform
team decides ad hoc, or per-environment, which workload goes where, with no
consistent policy and no audit trail proving the decision was correct. That
doesn't scale once you have more than a couple of environments, and it
doesn't survive an audit.

**Who deploys this:** platform/security engineering teams standing up a
hybrid or classified AI deployment need a policy layer between "here's a
job" and "here's where it's allowed to execute." SentinelGrid is that
layer, plus the dashboard an auditor or compliance reviewer would use to see
every decision and why it was made.

**What it replaces:** manual routing decisions, tribal knowledge about
"what goes where," and one-off scripts with no shared audit trail. It does
**not** replace the model/analysis engine itself — it sits in front of it as
a policy and deployment-tracking layer.

**Why this approach, now:** hybrid and air-gapped AI deployment has become a
mainstream requirement rather than an edge case — sovereign-cloud and
on-prem LLM deployments, and classified/IL5-IL6-style enclaves, are now a
standard ask wherever AI touches regulated or classified data. At the same
time, compliance regimes increasingly expect an automatic, per-decision
audit trail (why did this job run here and not somewhere else), which a
manual process can't produce reliably. A small, explicit policy engine with
a logged decision for every job is the direct answer to both pressures.

## What's built

- **Three simulated environments** with distinct properties — Cloud (cheap,
  elastic, external network, `PUBLIC` clearance ceiling), On-Prem (fixed
  capacity, controlled network, up to `CONFIDENTIAL`), Air-Gapped (no
  network at all, up to `CLASSIFIED`).
- **A classification scheme and routing policy** (`policy-config.ts`) —
  clearance ranking, network-mode compatibility, and environment
  preference order per classification. Documented in-app on the home page
  under "Data classification & routing policy."
- **A router** (`evaluate-routing.ts`) that evaluates every environment
  against five checks (online, clearance, network mode, capacity, incident
  type support), picks the best eligible one, and returns a full,
  human-readable justification — logged to the session audit trail.
- **A deployment view** (`/deployment`) showing one model artifact present
  and version/checksum-matched across all three environments, and the
  transfer log for how it reached the air-gapped enclave: CI/CD publish →
  controlled network sync → one-way data-diode export → manual verified
  import.
- **A blocked-request path** (`/routes/blocked`) — a job that no
  environment can satisfy is refused, not silently downgraded, with the
  per-environment reason shown.

## Running it

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. There is no backend and no external service —
everything runs client-side; session data (your evaluations) is kept in
this browser's `localStorage` only, so it survives a page refresh and
navigating between tabs, but never leaves the machine.

Other scripts:

```bash
npm test      # vitest — routing policy and analysis-generation unit tests
npm run lint  # eslint
npm run build # production build (also type-checks)
```

## Demo script (end to end)

1. On the home page, use **"Load demo scenario"** in the form and run each
   of the four fixtures in turn, clicking **Evaluate Route** after each:
   - *Public CVE Research* → routes to **Cloud**.
   - *Confidential Authentication Logs* → routes to **On-Prem**.
   - *Classified Telemetry* → routes to **Air-Gapped**.
   - *Secret External-Network Request* → **Blocked** — it's `SECRET`
     (only Air-Gapped is cleared) but requires `EXTERNAL` network access
     (which Air-Gapped, by design, cannot provide). No environment
     satisfies both, so the router refuses it and shows why.
2. Watch the **routing overview tiles**, the **environment status cards**,
   and the **session audit log** update after each run.
3. Click the **Cloud Routes / On-Prem Routes / Air-Gapped Routes** tabs (or
   the dashboard tiles) to see each incident filtered by where it landed,
   with an expandable per-environment check breakdown.
4. Click **Blocked Requests** to see the refused job and its reason.
5. Click **Deployment** to see the model artifact's version/checksum match
   across all three environments and the step-by-step log of how it reached
   the air-gapped enclave.
6. Use **Reset session** (bottom of the audit log) to clear the session and
   re-run the scenarios — this proves the app is stateless-safe and
   restarts cleanly rather than accumulating bad state.
7. Try an unexpected input: submit a custom incident with `CLASSIFIED`
   classification and `EXTERNAL` network mode — the same "no environment
   satisfies both" block fires, because the policy check is generic, not
   fixture-specific.

## Architecture

- **Next.js App Router + TypeScript**, styled with Tailwind.
- `src/features/sentinel/routing/` — the pure policy engine
  (`evaluate-routing.ts`, `policy-config.ts`), unit-tested independently of
  the UI.
- `src/features/sentinel/analysis/` — a local, rule-based "SentinelAI"
  triage summary generated for routed (non-blocked) incidents — explicitly
  labeled as a simulated local analysis, not a live model call.
- `src/features/sentinel/store/sentinel-store.tsx` — a React context
  holding the session's evaluation history, persisted to `localStorage` so
  it's shared across every route/tab.
- `src/app/` — the home page (live simulator + policy reference) plus one
  route per deliverable: `/routes/cloud`, `/routes/on-prem`,
  `/routes/air-gapped`, `/routes/blocked`, `/deployment`.
- All incident data, addresses, and log lines used in fixtures are
  synthetic; nothing here reflects a real system or incident.
