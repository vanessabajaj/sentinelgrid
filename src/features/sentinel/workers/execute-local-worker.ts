import { generateIncidentAnalysis } from "@/features/sentinel/analysis/generate-incident-analysis";
import type {
  EnvironmentId,
  Incident,
  WorkerExecutionMode,
} from "@/features/sentinel/types";
import type { WorkerExecutionResult } from "@/features/sentinel/workers/types";

interface LocalWorkerConfig {
  environmentId: EnvironmentId;
  executionMode: WorkerExecutionMode;
  workerName: string;
}

/**
 * Executes the shared deterministic analysis locally. The one-millisecond
 * completion offset models an execution boundary without timers, queues, or
 * external work and keeps repeated worker runs deterministic.
 */
export function executeLocalWorker(
  incident: Incident,
  config: LocalWorkerConfig,
): Promise<WorkerExecutionResult> {
  const analysis = generateIncidentAnalysis(incident);
  const startedAt = incident.submittedAt;
  const completedAt = new Date(
    new Date(startedAt).getTime() + 1,
  ).toISOString();

  return Promise.resolve({
    environmentId: config.environmentId,
    analysis,
    timeline: analysis.timeline,
    startedAt,
    completedAt,
    executionMode: config.executionMode,
    workerName: config.workerName,
  });
}
