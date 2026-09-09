export type Classification =
  | "PUBLIC"
  | "INTERNAL"
  | "CONFIDENTIAL"
  | "SECRET"
  | "CLASSIFIED";

export type EnvironmentId = "CLOUD" | "ON_PREM" | "AIR_GAPPED";

export type RoutingStatus = "ROUTED" | "BLOCKED";

/** Outcome recorded in the audit trail; includes pre-routing quarantine holds. */
export type WorkloadOutcome = RoutingStatus | "QUARANTINED";

export type IncidentType =
  | "FIREWALL_LOG"
  | "AUTHENTICATION_LOG"
  | "CVE_ANALYSIS"
  | "THREAT_INTELLIGENCE"
  | "CLASSIFIED_TELEMETRY";

export type NetworkMode = "NONE" | "CONTROLLED" | "EXTERNAL";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Incident {
  id: string;
  title: string;
  description: string;
  incidentType: IncidentType;
  classification: Classification;
  severity: Severity;
  requiredNetworkMode: NetworkMode;
  /** Normalized compute units used by the mock capacity policy. */
  estimatedWorkload: number;
  sampleContent: string;
  submittedAt: string;
}

export interface Environment {
  id: EnvironmentId;
  displayName: string;
  maxClassification: Classification;
  networkMode: NetworkMode;
  /** Total normalized compute units available to this environment. */
  capacity: number;
  /** Normalized compute units currently allocated. */
  usedCapacity: number;
  online: boolean;
  supportedIncidentTypes: IncidentType[];
}

export interface RoutingCheck {
  name: string;
  passed: boolean;
  reason: string;
}

export interface EnvironmentEvaluation {
  environmentId: EnvironmentId;
  eligible: boolean;
  checks: RoutingCheck[];
  score: number;
}

export interface RoutingDecision {
  id: string;
  incidentId: string;
  status: RoutingStatus;
  selectedEnvironment: EnvironmentId | null;
  policyVersion: string;
  explanation: string;
  evaluations: EnvironmentEvaluation[];
  evaluatedAt: string;
}

export interface AuditEntry {
  decisionId: string;
  timestamp: string;
  incidentTitle: string;
  classification: Classification;
  outcome: WorkloadOutcome;
  selectedEnvironment: EnvironmentId | null;
  policyVersion: string;
}

/**
 * Attributes the classification engine derives from raw incident content,
 * independent of whatever classification the submitter declared.
 */
export interface ClassificationSignals {
  containsPii: boolean;
  containsInternalIps: boolean;
  containsCredentials: boolean;
  containsClassifiedMarkers: boolean;
  requiresExternalNetwork: boolean;
}

export interface ClassificationResult extends ClassificationSignals {
  detectedClassification: Classification;
}

/** Fields a SOC analyst supplies when submitting a new incident for evaluation. */
export type IncidentSubmission = Omit<Incident, "id" | "submittedAt">;

/**
 * The complete server-side result of processing one incident submission:
 * classification, policy routing (skipped when quarantined), and analysis.
 */
export interface WorkloadResult {
  incident: Incident;
  classification: ClassificationResult;
  outcome: WorkloadOutcome;
  decision: RoutingDecision | null;
  analysis: IncidentAnalysis | null;
}

export interface IncidentAnalysis {
  severity: Severity;
  summary: string;
  suspectedAttackType: string;
  indicators: string[];
  recommendedActions: string[];
  /** Confidence percentage from 0 to 100. */
  confidence: number;
  generatedAt: string;
}
