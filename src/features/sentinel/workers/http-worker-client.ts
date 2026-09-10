import type {
  EnvironmentId,
  Incident,
  WorkerHealthStatus,
} from "@/features/sentinel/types";
import {
  isWorkerExecutionResult,
  isWorkerHealth,
} from "@/features/sentinel/workers/worker-contracts";
import {
  getWorkerBaseUrl,
  getWorkerDescriptor,
  getWorkerTimeoutMs,
} from "@/features/sentinel/workers/worker-config";
import type { WorkerExecutionResult } from "@/features/sentinel/workers/types";

export class WorkerDispatchError extends Error {
  constructor(
    message: string,
    readonly workerStatus: WorkerHealthStatus,
  ) {
    super(message);
    this.name = "WorkerDispatchError";
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const timeoutMs = getWorkerTimeoutMs();
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw new WorkerDispatchError(
        `Worker request timed out after ${timeoutMs}ms.`,
        "OFFLINE",
      );
    }

    if (error instanceof WorkerDispatchError) {
      throw error;
    }

    throw new WorkerDispatchError("Worker service is unreachable.", "OFFLINE");
  } finally {
    clearTimeout(timeout);
  }
}

export async function executeRemoteWorker(
  incident: Incident,
  environmentId: EnvironmentId,
): Promise<WorkerExecutionResult> {
  const descriptor = getWorkerDescriptor(environmentId);
  const response = await fetchWithTimeout(
    `${getWorkerBaseUrl(environmentId)}/execute`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(incident),
    },
  );

  if (!response.ok) {
    throw new WorkerDispatchError(
      `${descriptor.workerName} rejected execution with HTTP ${response.status}.`,
      "ONLINE",
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new WorkerDispatchError(
      `${descriptor.workerName} returned an unreadable response.`,
      "ONLINE",
    );
  }

  if (!isWorkerExecutionResult(payload, descriptor)) {
    throw new WorkerDispatchError(
      `${descriptor.workerName} returned a malformed execution response.`,
      "ONLINE",
    );
  }

  return payload;
}

export async function checkWorkerHealth(
  environmentId: EnvironmentId,
): Promise<WorkerHealthStatus> {
  const descriptor = getWorkerDescriptor(environmentId);

  try {
    const response = await fetchWithTimeout(
      `${getWorkerBaseUrl(environmentId)}/health`,
      { method: "GET" },
    );

    if (!response.ok) {
      return "OFFLINE";
    }

    const payload: unknown = await response.json();
    return isWorkerHealth(payload, descriptor) ? "ONLINE" : "OFFLINE";
  } catch {
    return "OFFLINE";
  }
}
