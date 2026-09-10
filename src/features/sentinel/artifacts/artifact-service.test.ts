import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  computeArtifactSha256,
  getArtifactManifest,
  getArtifactPath,
  loadArtifactMetadata,
  readArtifactBytes,
  verifyArtifactChecksum,
} from "@/features/sentinel/artifacts/artifact-service";

let temporaryDirectory: string;
let tamperedArtifactPath: string;

beforeAll(() => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), "sentinelgrid-artifact-"));
  tamperedArtifactPath = join(temporaryDirectory, "tampered-artifact.json");
  writeFileSync(
    tamperedArtifactPath,
    Buffer.concat([readArtifactBytes(), Buffer.from("\nTAMPERED")]),
  );
});

afterAll(() => {
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("artifact service", () => {
  it("loads the real SentinelAI artifact metadata", () => {
    expect(loadArtifactMetadata()).toEqual({
      modelName: "SentinelAI",
      version: "1.0.0",
      engine: "deterministic-security-analysis",
      supportedIncidentTypes: [
        "FIREWALL_LOG",
        "AUTHENTICATION_LOG",
        "CVE_ANALYSIS",
        "THREAT_INTELLIGENCE",
        "CLASSIFIED_TELEMETRY",
      ],
      analysisSchemaVersion: "1.0",
      createdFor: "SentinelGrid prototype",
    });
  });

  it("computes a 64-character hexadecimal SHA-256", () => {
    expect(computeArtifactSha256()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("computes SHA-256 from the actual artifact bytes", () => {
    const expected = createHash("sha256")
      .update(readArtifactBytes(getArtifactPath()))
      .digest("hex");

    expect(computeArtifactSha256()).toBe(expected);
  });

  it("returns the same checksum when the artifact is unchanged", () => {
    expect(computeArtifactSha256()).toBe(computeArtifactSha256());
  });

  it("produces a different checksum for a tampered copy", () => {
    expect(computeArtifactSha256(tamperedArtifactPath)).not.toBe(
      computeArtifactSha256(),
    );
  });

  it("verifies a matching checksum", () => {
    const manifest = getArtifactManifest();

    expect(verifyArtifactChecksum(manifest.sha256)).toBe(true);
    expect(manifest.verified).toBe(true);
    expect(manifest.sizeBytes).toBe(readArtifactBytes().byteLength);
  });

  it("rejects a mismatched checksum", () => {
    expect(verifyArtifactChecksum("0".repeat(64))).toBe(false);
    expect(
      verifyArtifactChecksum(
        computeArtifactSha256(),
        tamperedArtifactPath,
      ),
    ).toBe(false);
  });
});
