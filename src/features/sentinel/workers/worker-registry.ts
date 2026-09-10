import { airGapWorker } from "@/features/sentinel/workers/airgap-worker";
import { cloudWorker } from "@/features/sentinel/workers/cloud-worker";
import { onPremWorker } from "@/features/sentinel/workers/onprem-worker";
import type { EnvironmentId } from "@/features/sentinel/types";
import type { ExecutionWorker } from "@/features/sentinel/workers/types";

const WORKER_REGISTRY: Readonly<
  Partial<Record<EnvironmentId, ExecutionWorker>>
> = {
  CLOUD: cloudWorker,
  ON_PREM: onPremWorker,
  AIR_GAPPED: airGapWorker,
};

export function getExecutionWorker(
  environmentId: EnvironmentId,
): ExecutionWorker {
  const worker = WORKER_REGISTRY[environmentId];

  if (!worker) {
    throw new Error(
      `No execution worker is registered for environment: ${environmentId}.`,
    );
  }

  if (worker.environmentId !== environmentId) {
    throw new Error(
      `Execution worker for ${environmentId} does not support that environment.`,
    );
  }

  return worker;
}
