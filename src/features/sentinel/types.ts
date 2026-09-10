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

export type WorkloadExecutionStatus = "QUEUED" | "RUNNING" | "COMPLETED";

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
  /** Execution lifecycle for routed work; null when policy prevents execution. */
  executionStatus: WorkloadExecutionStatus | null;
  decision: RoutingDecision | null;
  analysis: IncidentAnalysis | null;
}

/** One chronological event in a reconstructed attack timeline. */
export interface AttackTimelineEvent {
  /** ISO 8601 timestamp of the event. */
  timestamp: string;
  description: string;
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
  timeline: AttackTimelineEvent[];
}

export type DeploymentStatus = "ACTIVE" | "UPDATE_PENDING" | "DEPLOYING";

/** The version of the model artifact deployed to one environment. */
export interface ModelDeployment {
  environmentId: EnvironmentId;
  version: string;
  status: DeploymentStatus;
  deployedAt: string;
}

/**
 * One signed model artifact and where each environment stands relative to
 * its latest version. Demonstrates "the same artifact deployed everywhere"
 * across trust boundaries, including the air-gapped one-way transfer.
 */
export interface ModelArtifact {
  name: string;
  latestVersion: string;
  sha256: string;
  deployments: ModelDeployment[];
}

/** One step in the air-gapped deployment pipeline's audit trail. */
export interface DeploymentPipelineStep {
  name: string;
  completedAt: string;
}

export interface AirGapDeploymentResult {
  artifact: ModelArtifact;
  steps: DeploymentPipelineStep[];
}
