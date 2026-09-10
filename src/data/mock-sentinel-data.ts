import type {
  Environment,
  EnvironmentId,
  Incident,
} from "@/features/sentinel/types";

/**
 * Local demonstration fixtures only. Every identifier, event, address, and log
 * line below is synthetic and does not describe a real system or incident.
 */
export const mockEnvironments = [
  {
    id: "CLOUD",
    displayName: "Cloud",
    maxClassification: "PUBLIC",
    networkMode: "EXTERNAL",
    capacity: 1_000,
    usedCapacity: 120,
    online: true,
    supportedIncidentTypes: ["CVE_ANALYSIS", "THREAT_INTELLIGENCE"],
  },
  {
    id: "ON_PREM",
    displayName: "On-Prem",
    maxClassification: "CONFIDENTIAL",
    networkMode: "CONTROLLED",
    capacity: 100,
    usedCapacity: 58,
    online: true,
    supportedIncidentTypes: [
      "FIREWALL_LOG",
      "AUTHENTICATION_LOG",
      "CVE_ANALYSIS",
      "THREAT_INTELLIGENCE",
    ],
  },
  {
    id: "AIR_GAPPED",
    displayName: "Air-Gapped",
    maxClassification: "CLASSIFIED",
    networkMode: "NONE",
    capacity: 30,
    usedCapacity: 12,
    online: true,
    supportedIncidentTypes: [
      "FIREWALL_LOG",
      "AUTHENTICATION_LOG",
      "CVE_ANALYSIS",
      "THREAT_INTELLIGENCE",
      "CLASSIFIED_TELEMETRY",
    ],
  },
] satisfies Environment[];

export const mockIncidents = [
  {
    id: "INC-DEMO-001",
    title: "Public CVE exposure research",
    description:
      "Evaluate a fictional public-facing service against a synthetic CVE advisory.",
    incidentType: "CVE_ANALYSIS",
    classification: "PUBLIC",
    severity: "HIGH",
    requiredNetworkMode: "EXTERNAL",
    estimatedWorkload: 24,
    sampleContent:
      "SYNTHETIC: demo-web-01.example.invalid reports package demo-server 4.2.0 for CVE research.",
    submittedAt: "2026-09-09T08:00:00.000Z",
  },
  {
    id: "INC-DEMO-002",
    title: "Confidential authentication anomaly",
    description:
      "Review synthetic sign-in failures from an internal identity service.",
    incidentType: "AUTHENTICATION_LOG",
    classification: "CONFIDENTIAL",
    severity: "MEDIUM",
    requiredNetworkMode: "CONTROLLED",
    estimatedWorkload: 18,
    sampleContent:
      "SYNTHETIC: 2030-01-01T10:05:00Z user=demo.analyst result=DENIED source=192.0.2.40 attempts=7",
    submittedAt: "2026-09-09T08:15:00.000Z",
  },
  {
    id: "INC-DEMO-003",
    title: "Classified enclave telemetry review",
    description:
      "Analyze synthetic telemetry originating from an isolated demonstration enclave.",
    incidentType: "CLASSIFIED_TELEMETRY",
    classification: "CLASSIFIED",
    severity: "CRITICAL",
    requiredNetworkMode: "NONE",
    estimatedWorkload: 10,
    sampleContent:
      "SYNTHETIC: enclave=DEMO-ZONE node=sim-node-07 event=unexpected-process status=contained",
    submittedAt: "2026-09-09T08:30:00.000Z",
  },
  {
    id: "INC-DEMO-004",
    title: "Secret external threat intelligence request",
    description:
      "Correlate a synthetic secret indicator with external threat intelligence sources.",
    incidentType: "THREAT_INTELLIGENCE",
    classification: "SECRET",
    severity: "HIGH",
    requiredNetworkMode: "EXTERNAL",
    estimatedWorkload: 8,
    sampleContent:
      "SYNTHETIC: indicator=demo-threat.example.invalid campaign=SIMULATION-ONLY confidence=unknown",
    submittedAt: "2026-09-09T08:45:00.000Z",
  },
  {
    id: "INC-DEMO-005",
    title: "Under-classified sensitive content",
    description:
      "Validate quarantine handling when the declared sensitivity understates the synthetic content.",
    incidentType: "CLASSIFIED_TELEMETRY",
    classification: "PUBLIC",
    severity: "HIGH",
    requiredNetworkMode: "NONE",
    estimatedWorkload: 6,
    sampleContent:
      "SYNTHETIC: CLASSIFIED enclave telemetry node=sim-node-12 handling=NOFORN status=contained",
    submittedAt: "2026-09-09T09:00:00.000Z",
  },
] satisfies Incident[];

/** Expected end-to-end outcomes for the built-in demo scenarios. */
export const mockExpectedRoutingOutcomes = {
  "INC-DEMO-001": "CLOUD",
  "INC-DEMO-002": "ON_PREM",
  "INC-DEMO-003": "AIR_GAPPED",
  "INC-DEMO-004": "BLOCKED",
  "INC-DEMO-005": "QUARANTINED",
} as const satisfies Record<
  string,
  EnvironmentId | "BLOCKED" | "QUARANTINED"
>;
