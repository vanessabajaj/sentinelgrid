import { describe, expect, it } from "vitest";

import {
  classifyContent,
  hasClassificationConflict,
} from "@/features/sentinel/classification/classify-content";

describe("classifyContent", () => {
  it("detects PUBLIC content with no sensitive signals", () => {
    const result = classifyContent(
      "SYNTHETIC: package demo-server 4.2.0 referenced by CVE-2026-1234.",
    );

    expect(result).toEqual({
      detectedClassification: "PUBLIC",
      containsPii: false,
      containsInternalIps: false,
      containsCredentials: false,
      containsClassifiedMarkers: false,
      requiresExternalNetwork: false,
    });
  });

  it("detects INTERNAL content from an RFC1918 address", () => {
    const result = classifyContent(
      "SYNTHETIC: source=10.20.4.23 destination=192.168.1.5 port=22",
    );

    expect(result.detectedClassification).toBe("INTERNAL");
    expect(result.containsInternalIps).toBe(true);
  });

  it("detects CONFIDENTIAL content from embedded credentials", () => {
    const result = classifyContent(
      "SYNTHETIC: config dump api_key=demo-abc123 for host demo-web-01",
    );

    expect(result.detectedClassification).toBe("CONFIDENTIAL");
    expect(result.containsCredentials).toBe(true);
  });

  it("detects CONFIDENTIAL content from PII", () => {
    const result = classifyContent(
      "SYNTHETIC: contact analyst@example.invalid regarding case 123-45-6789",
    );

    expect(result.detectedClassification).toBe("CONFIDENTIAL");
    expect(result.containsPii).toBe(true);
  });

  it("detects SECRET content from a classification marker", () => {
    const result = classifyContent(
      "SYNTHETIC: SECRET network telemetry from enclave DEMO-ZONE",
    );

    expect(result.detectedClassification).toBe("SECRET");
    expect(result.containsClassifiedMarkers).toBe(true);
  });

  it("flags a required external lookup even for otherwise low-sensitivity content", () => {
    const result = classifyContent(
      "SYNTHETIC: analyze these logs and search VirusTotal for matching indicators.",
    );

    expect(result.requiresExternalNetwork).toBe(true);
  });

  it("prioritizes classified markers over lower-rank signals", () => {
    const result = classifyContent(
      "SYNTHETIC: CLASSIFIED enclave node reachable at 10.1.1.1 with api_key=demo",
    );

    expect(result.detectedClassification).toBe("CLASSIFIED");
  });
});

describe("hasClassificationConflict", () => {
  it("flags a conflict when detected outranks declared", () => {
    expect(hasClassificationConflict("PUBLIC", "SECRET")).toBe(true);
  });

  it("does not flag a conflict when detected is equal or lower rank", () => {
    expect(hasClassificationConflict("SECRET", "SECRET")).toBe(false);
    expect(hasClassificationConflict("CLASSIFIED", "SECRET")).toBe(false);
  });
});
