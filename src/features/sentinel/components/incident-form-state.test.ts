import { describe, expect, it } from "vitest";

import { mockIncidents } from "@/data/mock-sentinel-data";
import {
  createEmptyIncidentFormState,
  selectDemoScenario,
} from "@/features/sentinel/components/incident-form-state";

describe("incident form scenario state", () => {
  it("defines the Public CVE demo as CVE analysis", () => {
    const publicCve = mockIncidents.find(
      (incident) => incident.id === "INC-DEMO-001",
    );

    expect(publicCve).toMatchObject({
      title: "Public CVE exposure research",
      incidentType: "CVE_ANALYSIS",
      classification: "PUBLIC",
      requiredNetworkMode: "EXTERNAL",
    });
  });

  it("replaces Classified Telemetry with every Public CVE field", () => {
    const classified = selectDemoScenario(
      createEmptyIncidentFormState(),
      mockIncidents,
      "INC-DEMO-003",
    );
    const publicCve = selectDemoScenario(
      classified,
      mockIncidents,
      "INC-DEMO-001",
    );

    expect(publicCve.selectedDemoId).toBe("INC-DEMO-001");
    expect(publicCve.submission).toMatchObject({
      title: "Public CVE exposure research",
      incidentType: "CVE_ANALYSIS",
      classification: "PUBLIC",
      requiredNetworkMode: "EXTERNAL",
      estimatedWorkload: 24,
    });
    expect(publicCve.submission.sampleContent).toContain("demo-web-01");
  });

  it("replaces Public CVE with every Classified Telemetry field", () => {
    const publicCve = selectDemoScenario(
      createEmptyIncidentFormState(),
      mockIncidents,
      "INC-DEMO-001",
    );
    const classified = selectDemoScenario(
      publicCve,
      mockIncidents,
      "INC-DEMO-003",
    );

    expect(classified.selectedDemoId).toBe("INC-DEMO-003");
    expect(classified.submission).toMatchObject({
      title: "Classified enclave telemetry review",
      incidentType: "CLASSIFIED_TELEMETRY",
      classification: "CLASSIFIED",
      requiredNetworkMode: "NONE",
      estimatedWorkload: 10,
    });
    expect(classified.submission.sampleContent).toContain("DEMO-ZONE");
  });

  it("loads the under-classified demo as a complete submission", () => {
    const underClassified = selectDemoScenario(
      createEmptyIncidentFormState(),
      mockIncidents,
      "INC-DEMO-005",
    );

    expect(mockIncidents).toHaveLength(5);
    expect(underClassified.submission).toMatchObject({
      title: "Under-classified sensitive content",
      incidentType: "CLASSIFIED_TELEMETRY",
      classification: "PUBLIC",
      requiredNetworkMode: "NONE",
      estimatedWorkload: 6,
    });
    expect(underClassified.submission.sampleContent).toContain("CLASSIFIED");
  });
});
