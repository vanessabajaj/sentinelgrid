import { describe, expect, it } from "vitest";

import {
  mockEnvironments,
  mockExpectedRoutingOutcomes,
  mockIncidents,
} from "@/data/mock-sentinel-data";
import type {
  Environment,
  EnvironmentId,
  Incident,
} from "@/features/sentinel/types";
import { evaluateRouting } from "@/features/sentinel/routing/evaluate-routing";

function cloneEnvironments(): Environment[] {
  return mockEnvironments.map((environment) => ({
    ...environment,
    supportedIncidentTypes: [...environment.supportedIncidentTypes],
  }));
}

function getIncident(id: string): Incident {
  const incident = mockIncidents.find((candidate) => candidate.id === id);

  if (!incident) {
    throw new Error(`Missing mock incident: ${id}`);
  }

  return incident;
}

function getEnvironment(
  environments: Environment[],
  id: EnvironmentId,
): Environment {
  const environment = environments.find((candidate) => candidate.id === id);

  if (!environment) {
    throw new Error(`Missing mock environment: ${id}`);
  }

  return environment;
}

describe("evaluateRouting", () => {
  it.each([
    ["INC-DEMO-001", "CLOUD"],
    ["INC-DEMO-002", "ON_PREM"],
    ["INC-DEMO-003", "AIR_GAPPED"],
  ] as const)("routes the %s fixture to %s", (incidentId, expected) => {
    const decision = evaluateRouting(
      getIncident(incidentId),
      cloneEnvironments(),
    );

    expect(decision.status).toBe("ROUTED");
    expect(decision.selectedEnvironment).toBe(expected);
    expect(decision.selectedEnvironment).toBe(
      mockExpectedRoutingOutcomes[incidentId],
    );
  });

  it("blocks a secret workload that requires external network access", () => {
    const incident = getIncident("INC-DEMO-004");
    const decision = evaluateRouting(incident, cloneEnvironments());

    expect(decision.status).toBe("BLOCKED");
    expect(decision.selectedEnvironment).toBeNull();
    expect(decision.selectedEnvironment ?? "BLOCKED").toBe("BLOCKED");
    expect(mockExpectedRoutingOutcomes["INC-DEMO-004"]).toBe("BLOCKED");
  });

  it("rejects an offline environment", () => {
    const environments = cloneEnvironments();
    getEnvironment(environments, "CLOUD").online = false;

    const decision = evaluateRouting(
      getIncident("INC-DEMO-001"),
      environments,
    );
    const cloudEvaluation = decision.evaluations.find(
      (evaluation) => evaluation.environmentId === "CLOUD",
    );
    const onlineCheck = cloudEvaluation?.checks.find(
      (check) => check.name === "Online",
    );

    expect(decision.status).toBe("BLOCKED");
    expect(cloudEvaluation?.eligible).toBe(false);
    expect(onlineCheck).toMatchObject({ passed: false });
    expect(onlineCheck?.reason).toContain("offline");
  });

  it("rejects an environment with insufficient capacity", () => {
    const environments = cloneEnvironments();
    const onPrem = getEnvironment(environments, "ON_PREM");
    onPrem.usedCapacity = onPrem.capacity;

    const decision = evaluateRouting(
      getIncident("INC-DEMO-002"),
      environments,
    );
    const capacityCheck = decision.evaluations
      .find((evaluation) => evaluation.environmentId === "ON_PREM")
      ?.checks.find((check) => check.name === "Capacity");

    expect(decision.status).toBe("BLOCKED");
    expect(capacityCheck).toMatchObject({ passed: false });
    expect(capacityCheck?.reason).toContain("only 0 capacity units");
  });

  it("rejects an environment that does not support the incident type", () => {
    const environments = cloneEnvironments();
    getEnvironment(environments, "CLOUD").supportedIncidentTypes = [];

    const decision = evaluateRouting(
      getIncident("INC-DEMO-001"),
      environments,
    );
    const supportCheck = decision.evaluations
      .find((evaluation) => evaluation.environmentId === "CLOUD")
      ?.checks.find((check) => check.name === "Incident type support");

    expect(decision.status).toBe("BLOCKED");
    expect(supportCheck).toMatchObject({ passed: false });
    expect(supportCheck?.reason).toContain("does not support");
  });

  it("includes visible rejection reasons for every blocked environment", () => {
    const decision = evaluateRouting(
      getIncident("INC-DEMO-004"),
      cloneEnvironments(),
    );

    expect(decision.explanation).toBe(
      "Blocked because no environment can satisfy all policy requirements.",
    );
    expect(decision.evaluations).toHaveLength(mockEnvironments.length);

    for (const evaluation of decision.evaluations) {
      expect(evaluation.eligible).toBe(false);
      expect(
        evaluation.checks.some(
          (check) => !check.passed && check.reason.length > 0,
        ),
      ).toBe(true);
    }
  });

  it("returns the same decision for the same inputs", () => {
    const incident = getIncident("INC-DEMO-002");
    const environments = cloneEnvironments();

    expect(evaluateRouting(incident, environments)).toEqual(
      evaluateRouting(incident, environments),
    );
  });
});
