import type {
  AttackTimelineEvent,
  EnvironmentId,
  Incident,
  IncidentAnalysis,
  WorkerExecutionMetadata,
} from "@/features/sentinel/types";

export interface WorkerExecutionResult extends WorkerExecutionMetadata {
  analysis: IncidentAnalysis;
  timeline: AttackTimelineEvent[];
}

export interface ExecutionWorker {
  environmentId: EnvironmentId;
  execute(incident: Incident): Promise<WorkerExecutionResult>;
}
