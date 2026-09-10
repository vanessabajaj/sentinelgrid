import type { EnvironmentId, Incident } from "@/features/sentinel/types";
import { executeRemoteWorker } from "@/features/sentinel/workers/http-worker-client";
import { getWorkerDispatchMode } from "@/features/sentinel/workers/worker-config";
import { getExecutionWorker } from "@/features/sentinel/workers/worker-registry";
import type { WorkerExecutionResult } from "@/features/sentinel/workers/types";

export async function dispatchIncident(
  incident: Incident,
  selectedEnvironment: EnvironmentId,
): Promise<WorkerExecutionResult> {
  const mode = getWorkerDispatchMode();
  const result =
    mode === "http"
      ? await executeRemoteWorker(incident, selectedEnvironment)
      : await getExecutionWorker(selectedEnvironment).execute(incident);

  if (result.environmentId !== selectedEnvironment) {
    throw new Error(
      `Execution worker returned ${result.environmentId} for ${selectedEnvironment}.`,
    );
  }

  return result;
}
