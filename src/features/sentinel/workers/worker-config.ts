import type {
  EnvironmentId,
  WorkerExecutionMode,
} from "../types";

export type WorkerDispatchMode = "local" | "http";

export interface WorkerDescriptor {
  environmentId: EnvironmentId;
  workerName: string;
  executionMode: WorkerExecutionMode;
  urlEnvironmentVariable: string;
}

const WORKER_DESCRIPTORS: Record<EnvironmentId, WorkerDescriptor> = {
  CLOUD: {
    environmentId: "CLOUD",
    workerName: "Sentinel Cloud Worker",
    executionMode: "EXTERNAL_CAPABLE",
    urlEnvironmentVariable: "CLOUD_WORKER_URL",
  },
  ON_PREM: {
    environmentId: "ON_PREM",
    workerName: "Sentinel On-Prem Worker",
    executionMode: "CONTROLLED_NETWORK",
    urlEnvironmentVariable: "ONPREM_WORKER_URL",
  },
  AIR_GAPPED: {
    environmentId: "AIR_GAPPED",
    workerName: "Sentinel Air-Gap Worker",
    executionMode: "OFFLINE",
    urlEnvironmentVariable: "AIRGAP_WORKER_URL",
  },
};

export function getWorkerDescriptor(
  environmentId: EnvironmentId,
): WorkerDescriptor {
  const descriptor = WORKER_DESCRIPTORS[environmentId];

  if (!descriptor) {
    throw new Error(
      `No execution worker is registered for environment: ${environmentId}.`,
    );
  }

  return descriptor;
}

export function getWorkerDispatchMode(): WorkerDispatchMode {
  const mode = process.env.SENTINEL_WORKER_MODE;

  if (mode === "local" || mode === "http") {
    return mode;
  }

  throw new Error(
    'SENTINEL_WORKER_MODE must be explicitly set to "local" or "http".',
  );
}

export function getWorkerBaseUrl(environmentId: EnvironmentId): string {
  const descriptor = getWorkerDescriptor(environmentId);
  const configuredUrl = process.env[descriptor.urlEnvironmentVariable];

  if (!configuredUrl) {
    throw new Error(
      `${descriptor.urlEnvironmentVariable} is required in HTTP worker mode.`,
    );
  }

  let url: URL;

  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error(
      `${descriptor.urlEnvironmentVariable} must be a valid HTTP URL.`,
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      `${descriptor.urlEnvironmentVariable} must use HTTP or HTTPS.`,
    );
  }

  return url.toString().replace(/\/$/, "");
}

export function getWorkerTimeoutMs(): number {
  const configuredTimeout = Number(process.env.WORKER_REQUEST_TIMEOUT_MS);

  if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
    return configuredTimeout;
  }

  return 5_000;
}
