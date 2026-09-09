export type Classification =
  | "PUBLIC"
  | "INTERNAL"
  | "CONFIDENTIAL"
  | "SECRET"
  | "CLASSIFIED";

export type EnvironmentId = "CLOUD" | "ON_PREM" | "AIR_GAPPED";

export type RoutingStatus = "ROUTED" | "BLOCKED";

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
  outcome: RoutingStatus;
  selectedEnvironment: EnvironmentId | null;
  policyVersion: string;
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
