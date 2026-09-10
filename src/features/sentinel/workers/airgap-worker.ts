import type { ExecutionWorker } from "@/features/sentinel/workers/types";
import { executeLocalWorker } from "@/features/sentinel/workers/execute-local-worker";
import { getWorkerDescriptor } from "@/features/sentinel/workers/worker-config";

const descriptor = getWorkerDescriptor("AIR_GAPPED");

/** Local-only worker: this implementation has no network or external-call path. */
export const airGapWorker: ExecutionWorker = {
  environmentId: "AIR_GAPPED",
  execute(incident) {
    return executeLocalWorker(incident, descriptor);
  },
};
