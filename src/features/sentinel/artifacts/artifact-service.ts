import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  ArtifactManifest,
  ArtifactMetadata,
  IncidentType,
} from "@/features/sentinel/types";

const ARTIFACT_FILE_NAME = "sentinel-ai-1.0.0.json";
const INCIDENT_TYPES: readonly IncidentType[] = [
  "FIREWALL_LOG",
  "AUTHENTICATION_LOG",
  "CVE_ANALYSIS",
  "THREAT_INTELLIGENCE",
  "CLASSIFIED_TELEMETRY",
];
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export function getArtifactPath(): string {
  return (
    process.env.SENTINEL_ARTIFACT_PATH ??
    join(process.cwd(), "artifacts", ARTIFACT_FILE_NAME)
  );
}

export function readArtifactBytes(artifactPath = getArtifactPath()): Buffer {
  return readFileSync(artifactPath);
}

export function computeBytesSha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function computeArtifactSha256(
  artifactPath = getArtifactPath(),
): string {
  return computeBytesSha256(readArtifactBytes(artifactPath));
}

function isArtifactMetadata(value: unknown): value is ArtifactMetadata {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.modelName === "SentinelAI" &&
    typeof record.version === "string" &&
    typeof record.engine === "string" &&
    Array.isArray(record.supportedIncidentTypes) &&
    record.supportedIncidentTypes.every((incidentType) =>
      INCIDENT_TYPES.includes(incidentType as IncidentType),
    ) &&
    typeof record.analysisSchemaVersion === "string" &&
    typeof record.createdFor === "string"
  );
}

export function loadArtifactMetadata(
  artifactPath = getArtifactPath(),
): ArtifactMetadata {
  let parsed: unknown;

  try {
    parsed = JSON.parse(readArtifactBytes(artifactPath).toString("utf8"));
  } catch {
    throw new Error("SentinelAI artifact metadata could not be loaded.");
  }

  if (!isArtifactMetadata(parsed)) {
    throw new Error("SentinelAI artifact metadata is invalid.");
  }

  return parsed;
}

export function verifyArtifactChecksum(
  suppliedChecksum: string,
  artifactPath = getArtifactPath(),
): boolean {
  if (!SHA256_PATTERN.test(suppliedChecksum)) {
    return false;
  }

  const actualChecksum = computeArtifactSha256(artifactPath);
  return timingSafeEqual(
    Buffer.from(suppliedChecksum, "hex"),
    Buffer.from(actualChecksum, "hex"),
  );
}

export function getArtifactManifest(
  artifactPath = getArtifactPath(),
): ArtifactManifest {
  const bytes = readArtifactBytes(artifactPath);
  const sha256 = computeBytesSha256(bytes);

  return {
    metadata: loadArtifactMetadata(artifactPath),
    sha256,
    sizeBytes: bytes.byteLength,
    verified: verifyArtifactChecksum(sha256, artifactPath),
  };
}

export interface ArtifactTransferVerification {
  sourceManifest: ArtifactManifest;
  importedSha256: string;
  importedSizeBytes: number;
  verified: boolean;
}

export function verifyImportedArtifact(
  importedBytes: Uint8Array,
  sourceArtifactPath = getArtifactPath(),
): ArtifactTransferVerification {
  const sourceManifest = getArtifactManifest(sourceArtifactPath);
  const importedSha256 = computeBytesSha256(importedBytes);
  const verified =
    importedBytes.byteLength === sourceManifest.sizeBytes &&
    SHA256_PATTERN.test(importedSha256) &&
    timingSafeEqual(
      Buffer.from(sourceManifest.sha256, "hex"),
      Buffer.from(importedSha256, "hex"),
    );

  return {
    sourceManifest,
    importedSha256,
    importedSizeBytes: importedBytes.byteLength,
    verified,
  };
}
