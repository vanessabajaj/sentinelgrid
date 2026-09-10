import type { ExecutionWorker } from "@/features/sentinel/workers/types";
import { executeLocalWorker } from "@/features/sentinel/workers/execute-local-worker";

/** Local-only worker: this implementation has no network or external-call path. */
export const airGapWorker: ExecutionWorker = {
  environmentId: "AIR_GAPPED",
  execute(incident) {
    return executeLocalWorker(incident, {
      environmentId: "AIR_GAPPED",
      executionMode: "OFFLINE",
      workerName: "Sentinel Air-Gap Worker",
    });
  },
};
