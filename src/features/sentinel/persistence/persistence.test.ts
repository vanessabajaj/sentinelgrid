import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockIncidents } from "@/data/mock-sentinel-data";
import {
  createSentinelStore,
  type SentinelStore,
} from "@/features/sentinel/server/sentinel-store";
import type {
  EnvironmentId,
  Incident,
  IncidentSubmission,
} from "@/features/sentinel/types";

function toSubmission(incident: Incident): IncidentSubmission {
  return {
    title: incident.title,
    description: incident.description,
    incidentType: incident.incidentType,
    classification: incident.classification,
    severity: incident.severity,
    requiredNetworkMode: incident.requiredNetworkMode,
    estimatedWorkload: incident.estimatedWorkload,
    sampleContent: incident.sampleContent,
  };
}

function scenario(index: number): IncidentSubmission {
  const incident = mockIncidents[index];
  if (!incident) {
    throw new Error(`Missing demo scenario ${index + 1}.`);
  }
  return toSubmission(incident);
}

describe("SQLite persistence", () => {
  let directory: string;
  let databasePath: string;
  let stores: SentinelStore[];

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "sentinelgrid-persistence-"));
    databasePath = join(directory, "sentinelgrid.sqlite");
    stores = [];
  });

  afterEach(() => {
    for (const store of stores) {
      store.close();
    }
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    rmSync(directory, { recursive: true, force: true });
  });

  function openStore(): SentinelStore {
    const store = createSentinelStore(databasePath);
    stores.push(store);
    return store;
  }

  function restart(store: SentinelStore): SentinelStore {
    store.close();
    return openStore();
  }

  it("persists a completed workload and its execution result", async () => {
    const first = openStore();
    const result = await first.submitIncident(scenario(0));
    const second = restart(first);

    expect(result.executionStatus).toBe("COMPLETED");
    expect(second.listWorkloads()).toHaveLength(1);
    expect(second.listWorkloads()[0]).toEqual(result);
  });

  it("persists a blocked workload without worker metadata", async () => {
    const first = openStore();
    const result = await first.submitIncident(scenario(3));
    const second = restart(first);

    expect(result.outcome).toBe("BLOCKED");
    expect(second.listWorkloads()[0]).toMatchObject({
      outcome: "BLOCKED",
      executionStatus: null,
      workerExecution: null,
    });
  });

  it("persists a quarantined workload without worker metadata", async () => {
    const first = openStore();
    const result = await first.submitIncident(scenario(4));
    const second = restart(first);

    expect(result.outcome).toBe("QUARANTINED");
    expect(second.listWorkloads()[0]).toMatchObject({
      outcome: "QUARANTINED",
      executionStatus: null,
      workerExecution: null,
    });
  });

  it("persists a failed worker execution", async () => {
    vi.stubEnv("SENTINEL_WORKER_MODE", "http");
    vi.stubEnv("CLOUD_WORKER_URL", "http://cloud-worker.test:4101");
    vi.stubEnv("ONPREM_WORKER_URL", "http://onprem-worker.test:4102");
    vi.stubEnv("AIRGAP_WORKER_URL", "http://airgap-worker.test:4103");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unreachable")));

    const first = openStore();
    const result = await first.submitIncident(scenario(0));
    const second = restart(first);

    expect(result.executionStatus).toBe("FAILED");
    expect(second.listWorkloads()[0].executionFailure?.reason).toContain(
      "unreachable",
    );
  });

  it("retains the audit entry across service reinitialization", async () => {
    const first = openStore();
    const result = await first.submitIncident(scenario(1));
    const second = restart(first);

    expect(second.listAuditEntries()).toHaveLength(1);
    expect(second.listAuditEntries()[0]).toMatchObject({
      decisionId: result.decision?.id,
      incidentTitle: result.incident.title,
      outcome: "ROUTED",
      selectedEnvironment: "ON_PREM",
    });
  });

  it("retains Air-Gap deployment activation across reinitialization", () => {
    const first = openStore();
    const deployment = first.deployModelToAirGap();
    const second = restart(first);
    const airGap = second
      .getModelArtifact()
      .deployments.find((item) => item.environmentId === "AIR_GAPPED");

    expect(deployment.verificationPassed).toBe(true);
    expect(airGap).toMatchObject({
      version: "1.0.0",
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
    });
  });

  it("reset clears records and restores persistent deployment baseline", async () => {
    const first = openStore();
    await first.submitIncident(scenario(0));
    first.deployModelToAirGap();
    first.reset();
    const second = restart(first);
    const airGap = second
      .getModelArtifact()
      .deployments.find((item) => item.environmentId === "AIR_GAPPED");

    expect(second.listWorkloads()).toHaveLength(0);
    expect(second.listAuditEntries()).toHaveLength(0);
    expect(airGap).toMatchObject({
      version: "0.9.4",
      status: "UPDATE_PENDING",
      verificationStatus: "PENDING",
    });
  });

  it("does not retain completed-workload capacity after restart", async () => {
    const first = openStore();
    const before = first
      .getEnvironments()
      .find((environment) => environment.id === "CLOUD")?.usedCapacity;
    await first.submitIncident(scenario(0));
    const second = restart(first);
    const after = second
      .getEnvironments()
      .find((environment) => environment.id === "CLOUD")?.usedCapacity;

    expect(after).toBe(before);
  });

  it("refreshes worker health instead of trusting stale persisted status", async () => {
    const first = openStore();
    await first.refreshWorkerHealth();
    expect(first.getEnvironments().map(({ workerStatus }) => workerStatus)).toEqual(
      ["ONLINE", "ONLINE", "ONLINE"],
    );

    const second = restart(first);
    expect(second.getEnvironments().map(({ workerStatus }) => workerStatus)).toEqual(
      ["UNKNOWN", "UNKNOWN", "UNKNOWN"],
    );
  });

  it("does not duplicate baseline records during repeated initialization", () => {
    const first = openStore();
    first.close();
    const second = openStore();
    second.close();

    const database = new Database(databasePath, { readonly: true });
    const environmentCount = database
      .prepare("SELECT COUNT(*) AS count FROM environment_state")
      .get() as { count: number };
    const deploymentCount = database
      .prepare("SELECT COUNT(*) AS count FROM deployment_state")
      .get() as { count: number };
    const migrationCount = database
      .prepare("SELECT COUNT(*) AS count FROM schema_migrations")
      .get() as { count: number };
    database.close();

    expect(environmentCount.count).toBe(3);
    expect(deploymentCount.count).toBe(3);
    expect(migrationCount.count).toBe(1);
  });

  it("preserves all five deterministic demo outcomes in SQLite", async () => {
    const store = openStore();
    const results = [];
    for (const incident of mockIncidents) {
      results.push(await store.submitIncident(toSubmission(incident)));
    }

    expect(
      results.map((result) =>
        result.outcome === "ROUTED"
          ? result.decision?.selectedEnvironment
          : result.outcome,
      ),
    ).toEqual([
      "CLOUD",
      "ON_PREM",
      "AIR_GAPPED",
      "BLOCKED",
      "QUARANTINED",
    ] satisfies Array<EnvironmentId | "BLOCKED" | "QUARANTINED">);
  });
});
