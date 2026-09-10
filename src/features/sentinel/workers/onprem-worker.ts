import type { ExecutionWorker } from "@/features/sentinel/workers/types";
import { executeLocalWorker } from "@/features/sentinel/workers/execute-local-worker";
import { getWorkerDescriptor } from "@/features/sentinel/workers/worker-config";

const descriptor = getWorkerDescriptor("ON_PREM");

export const onPremWorker: ExecutionWorker = {
  environmentId: "ON_PREM",
  execute(incident) {
    return executeLocalWorker(incident, descriptor);
  },
};
