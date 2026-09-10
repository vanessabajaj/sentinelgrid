import { describe, expect, it } from "vitest";

import { mockIncidents } from "@/data/mock-sentinel-data";
import { generateAttackTimeline } from "@/features/sentinel/analysis/generate-attack-timeline";
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

describe("generateAttackTimeline", () => {
  it("produces chronologically ordered events ending at detection time", () => {
    const incident = getIncident("AUTHENTICATION_LOG");
    const timeline = generateAttackTimeline(incident);

    expect(timeline.length).toBeGreaterThan(1);

    for (let index = 1; index < timeline.length; index += 1) {
      expect(new Date(timeline[index].timestamp).getTime()).toBeGreaterThan(
        new Date(timeline[index - 1].timestamp).getTime(),
      );
    }

    expect(timeline[timeline.length - 1].timestamp).toBe(incident.submittedAt);
  });

  it("embeds observed signals from the sample content", () => {
    const incident = getIncident("AUTHENTICATION_LOG");
    const timeline = generateAttackTimeline(incident);

    expect(timeline.some((event) => event.description.includes("7"))).toBe(
      true,
    );
  });

  it("is deterministic for the same incident", () => {
    const incident = getIncident("CVE_ANALYSIS");

    expect(generateAttackTimeline(incident)).toEqual(
      generateAttackTimeline(incident),
    );
  });

  it("produces a non-empty timeline for a firewall log incident", () => {
    const firewallIncident: Incident = {
      ...getIncident("AUTHENTICATION_LOG"),
      id: "INC-TIMELINE-FIREWALL",
      incidentType: "FIREWALL_LOG",
      sampleContent:
        "SYNTHETIC: src=192.0.2.12 destination=198.51.100.8 port=443 action=denied",
    };

    const timeline = generateAttackTimeline(firewallIncident);

    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline.some((event) => event.description.includes("192.0.2.12"))).toBe(
      true,
    );
  });

  it("produces a distinct template per incident type", () => {
    const types: IncidentType[] = [
      "AUTHENTICATION_LOG",
      "CVE_ANALYSIS",
      "THREAT_INTELLIGENCE",
      "CLASSIFIED_TELEMETRY",
    ];

    for (const type of types) {
      const timeline = generateAttackTimeline(getIncident(type));
      expect(timeline.length).toBeGreaterThan(0);
    }
  });
});
