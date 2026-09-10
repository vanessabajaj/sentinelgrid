import { firstMatch } from "@/features/sentinel/analysis/extract-signal";
import type {
  AttackTimelineEvent,
  Incident,
  IncidentType,
} from "@/features/sentinel/types";

/**
 * Reconstructs a short chronological event sequence for an incident, so the
 * analysis reads as more than a single verdict. Deterministic and rule
 * based: minutes-before-detection offsets applied to the incident's
 * submission time, with descriptions built from whatever signals are
 * present in the synthetic sample content.
 */

type TimelineTemplate = (incident: Incident) => string[];

const MINUTE_OFFSETS_BEFORE_DETECTION = [8, 7, 6, 4, 2, 0];

const TIMELINE_TEMPLATES: Record<IncidentType, TimelineTemplate> = {
  AUTHENTICATION_LOG: (incident) => {
    const attempts = firstMatch(incident.sampleContent, /\battempts[=:](\d+)\b/i);
    const source = firstMatch(
      incident.sampleContent,
      /\bsource[=:]((?:\d{1,3}\.){3}\d{1,3})\b/i,
    );

    return [
      "Failed login attempt recorded.",
      `${attempts ?? "Several"} additional failed attempts recorded${source ? ` from ${source}` : ""}.`,
      "Login succeeded following repeated failures.",
      "New privileged process observed on the target host.",
      "Outbound network connection established.",
      "Event escalated for analyst review.",
    ];
  },
  FIREWALL_LOG: (incident) => {
    const source = firstMatch(
      incident.sampleContent,
      /\b(?:src|source)[=:]([^\s,;]+)/i,
    );
    const destination = firstMatch(
      incident.sampleContent,
      /\b(?:dst|destination)[=:]([^\s,;]+)/i,
    );
    const port = firstMatch(incident.sampleContent, /\b(?:port|dpt)[=:](\d{1,5})\b/i);

    return [
      `Initial connection attempt${source ? ` from ${source}` : ""}.`,
      `Repeated connection attempts${port ? ` targeting port ${port}` : ""}.`,
      "Traffic pattern deviates from the expected baseline.",
      `Destination${destination ? ` ${destination}` : ""} flagged for review.`,
      "Event escalated for analyst review.",
    ];
  },
  CVE_ANALYSIS: (incident) => {
    const advisory = firstMatch(incident.sampleContent, /\b(CVE-\d{4}-\d{4,})\b/i);
    const asset = firstMatch(
      incident.sampleContent,
      /\b([a-z0-9-]+(?:\.[a-z0-9-]+)+)\b/i,
    );

    return [
      `Advisory${advisory ? ` ${advisory.toUpperCase()}` : ""} published.`,
      "Affected software identified in the asset inventory.",
      "Exposure validation initiated against deployed services.",
      `Asset${asset ? ` ${asset}` : ""} flagged as potentially reachable.`,
      "Remediation ticket opened through the change process.",
    ];
  },
  THREAT_INTELLIGENCE: (incident) => {
    const indicator = firstMatch(
      incident.sampleContent,
      /\bindicator[=:]([^\s,;]+)/i,
    );
    const campaign = firstMatch(
      incident.sampleContent,
      /\bcampaign[=:]([^\s,;]+)/i,
    );

    return [
      `Indicator${indicator ? ` ${indicator}` : ""} received from a threat feed.`,
      "Indicator matched against internal telemetry.",
      `Campaign association${campaign ? `: ${campaign}` : " under review"}.`,
      "Confidence scoring initiated.",
      "Analyst review requested.",
    ];
  },
  CLASSIFIED_TELEMETRY: (incident) => {
    const node = firstMatch(incident.sampleContent, /\bnode[=:]([^\s,;]+)/i);
    const enclave = firstMatch(
      incident.sampleContent,
      /\benclave[=:]([^\s,;]+)/i,
    );

    return [
      `Anomaly detected${node ? ` on node ${node}` : ""}.`,
      `Enclave${enclave ? ` ${enclave}` : ""} isolated for review.`,
      "Event logged to the restricted monitoring context.",
      "Containment procedures initiated within the enclave.",
      "Secure escalation submitted through the SOC workflow.",
    ];
  },
};

export function generateAttackTimeline(
  incident: Incident,
): AttackTimelineEvent[] {
  const descriptions = TIMELINE_TEMPLATES[incident.incidentType](incident);
  const detectionTime = new Date(incident.submittedAt).getTime();

  return descriptions.map((description, index) => {
    const minutesBefore =
      MINUTE_OFFSETS_BEFORE_DETECTION[index] ??
      MINUTE_OFFSETS_BEFORE_DETECTION[MINUTE_OFFSETS_BEFORE_DETECTION.length - 1];

    return {
      timestamp: new Date(detectionTime - minutesBefore * 60_000).toISOString(),
      description,
    };
  });
}
