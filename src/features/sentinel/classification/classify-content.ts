import { CLASSIFICATION_RANK } from "@/features/sentinel/routing/policy-config";
import type {
  Classification,
  ClassificationResult,
} from "@/features/sentinel/types";

/**
 * The security classification engine. It inspects raw incident text —
 * independent of whatever classification the submitter declared — and
 * derives sensitivity attributes plus a detected classification. This lets
 * the policy engine flag a mismatch (e.g. a SECRET workload declared as
 * PUBLIC) instead of trusting the declared value outright.
 */

const CLASSIFIED_MARKER_PATTERN =
  /\b(top secret|secret|classified|restricted|milnet|noforn)\b/i;
const TOP_TIER_MARKER_PATTERN = /\b(top secret|classified|milnet|noforn)\b/i;
const INTERNAL_IP_PATTERN =
  /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/;
const CREDENTIAL_PATTERN =
  /\b(password|passwd|api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[=:]\s*\S+/i;
const PII_PATTERN =
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b|\b\d{3}-\d{2}-\d{4}\b/;
const EXTERNAL_LOOKUP_PATTERN =
  /\b(virustotal|shodan|search the internet|osint|external threat intel(?:ligence)?|public database|whois lookup)\b/i;

export function classifyContent(rawContent: string): ClassificationResult {
  const containsClassifiedMarkers = CLASSIFIED_MARKER_PATTERN.test(rawContent);
  const containsInternalIps = INTERNAL_IP_PATTERN.test(rawContent);
  const containsCredentials = CREDENTIAL_PATTERN.test(rawContent);
  const containsPii = PII_PATTERN.test(rawContent);
  const requiresExternalNetwork = EXTERNAL_LOOKUP_PATTERN.test(rawContent);

  let detectedClassification: Classification = "PUBLIC";
  if (containsClassifiedMarkers) {
    detectedClassification = TOP_TIER_MARKER_PATTERN.test(rawContent)
      ? "CLASSIFIED"
      : "SECRET";
  } else if (containsCredentials || containsPii) {
    detectedClassification = "CONFIDENTIAL";
  } else if (containsInternalIps) {
    detectedClassification = "INTERNAL";
  }

  return {
    detectedClassification,
    containsPii,
    containsInternalIps,
    containsCredentials,
    containsClassifiedMarkers,
    requiresExternalNetwork,
  };
}

/** True when the detected classification is more sensitive than declared. */
export function hasClassificationConflict(
  declared: Classification,
  detected: Classification,
): boolean {
  return CLASSIFICATION_RANK[detected] > CLASSIFICATION_RANK[declared];
}
