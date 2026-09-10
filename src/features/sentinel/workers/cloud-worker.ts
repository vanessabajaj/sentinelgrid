import type { ExecutionWorker } from "@/features/sentinel/workers/types";
import { executeLocalWorker } from "@/features/sentinel/workers/execute-local-worker";

export const cloudWorker: ExecutionWorker = {
  environmentId: "CLOUD",
  execute(incident) {
    return executeLocalWorker(incident, {
      environmentId: "CLOUD",
      executionMode: "EXTERNAL_CAPABLE",
      workerName: "Sentinel Cloud Worker",
    });
  },
};
