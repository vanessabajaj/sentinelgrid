import type { EnvironmentId, Incident } from "@/features/sentinel/types";
import { getExecutionWorker } from "@/features/sentinel/workers/worker-registry";
import type { WorkerExecutionResult } from "@/features/sentinel/workers/types";

export async function dispatchIncident(
  incident: Incident,
  selectedEnvironment: EnvironmentId,
): Promise<WorkerExecutionResult> {
  const worker = getExecutionWorker(selectedEnvironment);
  const result = await worker.execute(incident);

  if (result.environmentId !== selectedEnvironment) {
    throw new Error(
      `Execution worker ${worker.environmentId} returned an unsupported environment.`,
    );
  }

  return result;
}
