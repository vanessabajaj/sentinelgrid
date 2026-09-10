import { firstMatch } from "./extract-signal";
import { generateAttackTimeline } from "./generate-attack-timeline";
import type {
  Incident,
  IncidentAnalysis,
  IncidentType,
} from "../types";

interface AnalysisTemplate {
  suspectedAttackType: string;
  defaultIndicators: string[];
  recommendedActions: string[];
  baseConfidence: number;
}

interface IndicatorResult {
  indicators: string[];
  observedSignalCount: number;
}

const ANALYSIS_TEMPLATES: Record<IncidentType, AnalysisTemplate> = {
  CVE_ANALYSIS: {
    suspectedAttackType: "Vulnerability Exposure",
    defaultIndicators: [
      "A software or version reference requires exposure validation.",
      "Public exploit availability may increase remediation urgency.",
    ],
    recommendedActions: [
      "Patch or mitigate the affected software through the approved change process.",
      "Validate whether the vulnerable service is reachable in the deployed environment.",
      "Review the vendor advisory and approved vulnerability intelligence.",
    ],
    baseConfidence: 80,
  },
  AUTHENTICATION_LOG: {
    suspectedAttackType: "Credential Brute Force / Account Compromise",
    defaultIndicators: [
      "Repeated failed login behavior is present in the synthetic event.",
      "The authentication pattern warrants user and source verification.",
    ],
    recommendedActions: [
      "Block or rate-limit the source after validating the indicator.",
      "Reset potentially exposed credentials using the approved identity workflow.",
      "Review MFA enrollment and recent authentication history for the account.",
    ],
    baseConfidence: 84,
  },
  FIREWALL_LOG: {
    suspectedAttackType: "Suspicious Network Activity",
    defaultIndicators: [
      "Repeated connection attempts may indicate probing or unauthorized access.",
      "Source and destination behavior differs from the expected traffic pattern.",
    ],
    recommendedActions: [
      "Isolate the affected host if the activity is confirmed malicious.",
      "Block the validated indicator through the approved network controls.",
      "Review surrounding traffic for related sources, destinations, and ports.",
    ],
    baseConfidence: 78,
  },
  THREAT_INTELLIGENCE: {
    suspectedAttackType: "Threat Intelligence Match",
    defaultIndicators: [
      "A suspicious IP, domain, or hash requires validation.",
      "The indicator context is incomplete until corroborated by approved sources.",
    ],
    recommendedActions: [
      "Enrich the indicator using offline or otherwise approved intelligence sources.",
      "Block the indicator only after its malicious status is validated.",
      "Search permitted telemetry for related activity and preserve the findings.",
    ],
    baseConfidence: 74,
  },
  CLASSIFIED_TELEMETRY: {
    suspectedAttackType: "Restricted Network Anomaly",
    defaultIndicators: [
      "Anomalous activity is present in sensitive synthetic telemetry.",
      "The event originated inside a restricted monitoring context.",
    ],
    recommendedActions: [
      "Escalate the event through the secure SOC workflow.",
      "Preserve the telemetry and associated evidence within the restricted environment.",
      "Isolate the affected asset using authorized enclave procedures.",
    ],
    baseConfidence: 84,
  },
};

function buildIndicators(incident: Incident): IndicatorResult {
  const content = incident.sampleContent;
  const observed: string[] = [];

  if (incident.incidentType === "CVE_ANALYSIS") {
    const software = content.match(
      /\bpackage[=: ]+([a-z0-9._-]+)\s+(?:version[=: ]+)?(v?\d+(?:\.\d+){1,3})\b/i,
    );
    const advisory = firstMatch(content, /\b(CVE-\d{4}-\d{4,})\b/i);
    const asset = firstMatch(
      content,
      /\b([a-z0-9-]+(?:\.[a-z0-9-]+)+)\b/i,
    );

    if (software) {
      observed.push(`Affected software reference: ${software[1]} ${software[2]}.`);
    }
    if (advisory) {
      observed.push(`Advisory identifier observed: ${advisory.toUpperCase()}.`);
    }
    if (asset) {
      observed.push(`Potentially exposed asset: ${asset}.`);
    }
  }

  if (incident.incidentType === "AUTHENTICATION_LOG") {
    const attempts = firstMatch(content, /\battempts[=:](\d+)\b/i);
    const source = firstMatch(
      content,
      /\bsource[=:]((?:\d{1,3}\.){3}\d{1,3})\b/i,
    );
    const user = firstMatch(content, /\buser[=:]([a-z0-9._-]+)\b/i);

    if (attempts) {
      observed.push(`${attempts} repeated authentication attempts were recorded.`);
    }
    if (source) {
      observed.push(`Unusual login source observed: ${source}.`);
    }
    if (user) {
      observed.push(`Account requiring review: ${user}.`);
    }
  }

  if (incident.incidentType === "FIREWALL_LOG") {
    const source = firstMatch(content, /\b(?:src|source)[=:]([^\s,;]+)/i);
    const destination = firstMatch(
      content,
      /\b(?:dst|destination)[=:]([^\s,;]+)/i,
    );
    const port = firstMatch(content, /\b(?:port|dpt)[=:](\d{1,5})\b/i);

    if (source) {
      observed.push(`Network source under review: ${source}.`);
    }
    if (destination) {
      observed.push(`Destination exhibiting abnormal activity: ${destination}.`);
    }
    if (port) {
      observed.push(`Repeated activity targets port ${port}.`);
    }
  }

  if (incident.incidentType === "THREAT_INTELLIGENCE") {
    const indicator = firstMatch(content, /\bindicator[=:]([^\s,;]+)/i);
    const campaign = firstMatch(content, /\bcampaign[=:]([^\s,;]+)/i);

    if (indicator) {
      observed.push(`Suspicious indicator submitted for matching: ${indicator}.`);
    }
    if (campaign) {
      observed.push(`Synthetic campaign association: ${campaign}.`);
    }
  }

  if (incident.incidentType === "CLASSIFIED_TELEMETRY") {
    const enclave = firstMatch(content, /\benclave[=:]([^\s,;]+)/i);
    const node = firstMatch(content, /\bnode[=:]([^\s,;]+)/i);
    const event = firstMatch(content, /\bevent[=:]([^\s,;]+)/i);

    if (enclave) {
      observed.push(`Restricted enclave context: ${enclave}.`);
    }
    if (node) {
      observed.push(`Sensitive asset reporting the anomaly: ${node}.`);
    }
    if (event) {
      observed.push(`Telemetry anomaly observed: ${event.replaceAll("-", " ")}.`);
    }
  }

  const template = ANALYSIS_TEMPLATES[incident.incidentType];

  return {
    indicators: Array.from(
      new Set([...observed, ...template.defaultIndicators]),
    ).slice(0, 4),
    observedSignalCount: observed.length,
  };
}

export function generateIncidentAnalysis(
  incident: Incident,
): IncidentAnalysis {
  const template = ANALYSIS_TEMPLATES[incident.incidentType];
  const { indicators, observedSignalCount } = buildIndicators(incident);
  const confidence = Math.min(
    96,
    template.baseConfidence + observedSignalCount * 3,
  );

  return {
    severity: incident.severity,
    summary: `Synthetic local review of “${incident.title}” identified ${indicators.length} indicators consistent with ${template.suspectedAttackType.toLowerCase()}. Validate these rule-based findings before taking response action.`,
    suspectedAttackType: template.suspectedAttackType,
    indicators,
    recommendedActions: [...template.recommendedActions],
    confidence,
    generatedAt: incident.submittedAt,
    timeline: generateAttackTimeline(incident),
  };
}
