import { describe, expect, it } from "vitest";

import { mockIncidents } from "@/data/mock-sentinel-data";
import { generateIncidentAnalysis } from "@/features/sentinel/analysis/generate-incident-analysis";
import type { Incident, IncidentType } from "@/features/sentinel/types";

function getIncident(type: IncidentType): Incident {
  const incident = mockIncidents.find(
    (candidate) => candidate.incidentType === type,
  );

  if (!incident) {
    throw new Error(`Missing mock incident for ${type}`);
  }

  return incident;
}

describe("generateIncidentAnalysis", () => {
  it.each([
    ["CVE_ANALYSIS", "Vulnerability Exposure"],
    [
      "AUTHENTICATION_LOG",
      "Credential Brute Force / Account Compromise",
    ],
    ["THREAT_INTELLIGENCE", "Threat Intelligence Match"],
    ["CLASSIFIED_TELEMETRY", "Restricted Network Anomaly"],
  ] as const)("maps %s to %s", (incidentType, suspectedAttackType) => {
    expect(
      generateIncidentAnalysis(getIncident(incidentType)).suspectedAttackType,
    ).toBe(suspectedAttackType);
  });

  it("maps firewall logs to suspicious network activity", () => {
    const firewallIncident: Incident = {
      ...getIncident("AUTHENTICATION_LOG"),
      id: "INC-ANALYSIS-FIREWALL",
      incidentType: "FIREWALL_LOG",
      sampleContent:
        "SYNTHETIC: src=192.0.2.12 destination=198.51.100.8 port=443 action=denied",
    };

    const analysis = generateIncidentAnalysis(firewallIncident);

    expect(analysis.suspectedAttackType).toBe("Suspicious Network Activity");
    expect(analysis.indicators).toContain(
      "Network source under review: 192.0.2.12.",
    );
  });

  it("extracts deterministic signals from synthetic sample content", () => {
    const incident = getIncident("CVE_ANALYSIS");
    const firstAnalysis = generateIncidentAnalysis(incident);
    const secondAnalysis = generateIncidentAnalysis(incident);

    expect(firstAnalysis).toEqual(secondAnalysis);
    expect(firstAnalysis.generatedAt).toBe(incident.submittedAt);
    expect(firstAnalysis.severity).toBe(incident.severity);
    expect(firstAnalysis.indicators).toContain(
      "Affected software reference: demo-server 4.2.0.",
    );
    expect(firstAnalysis.confidence).toBeGreaterThanOrEqual(80);
    expect(firstAnalysis.confidence).toBeLessThanOrEqual(100);
  });
});
