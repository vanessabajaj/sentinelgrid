import type { ExecutionWorker } from "@/features/sentinel/workers/types";
import { executeLocalWorker } from "@/features/sentinel/workers/execute-local-worker";

export const onPremWorker: ExecutionWorker = {
  environmentId: "ON_PREM",
  execute(incident) {
    return executeLocalWorker(incident, {
      environmentId: "ON_PREM",
      executionMode: "CONTROLLED_NETWORK",
      workerName: "Sentinel On-Prem Worker",
    });
  },
};
