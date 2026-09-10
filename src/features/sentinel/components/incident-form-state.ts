import type {
  Incident,
  IncidentSubmission,
} from "@/features/sentinel/types";

export interface IncidentFormState {
  selectedDemoId: string;
  submission: IncidentSubmission;
}

const EMPTY_SUBMISSION: IncidentSubmission = {
  title: "",
  description: "",
  incidentType: "FIREWALL_LOG",
  classification: "PUBLIC",
  severity: "MEDIUM",
  requiredNetworkMode: "NONE",
  estimatedWorkload: 10,
  sampleContent: "SYNTHETIC: Local analyst-created demonstration incident.",
};

export function createEmptyIncidentFormState(): IncidentFormState {
  return {
    selectedDemoId: "",
    submission: { ...EMPTY_SUBMISSION },
  };
}

export function incidentToSubmission(
  incident: Incident,
): IncidentSubmission {
  return {
    title: incident.title,
    description: incident.description,
    incidentType: incident.incidentType,
    classification: incident.classification,
    severity: incident.severity,
    requiredNetworkMode: incident.requiredNetworkMode,
    estimatedWorkload: incident.estimatedWorkload,
    sampleContent: incident.sampleContent,
  };
}

/** Replaces every submitted field atomically when a demo scenario changes. */
export function selectDemoScenario(
  current: IncidentFormState,
  demoIncidents: Incident[],
  selectedDemoId: string,
): IncidentFormState {
  const scenario = demoIncidents.find(
    (incident) => incident.id === selectedDemoId,
  );

  if (!scenario) {
    return { ...current, selectedDemoId };
  }

  return {
    selectedDemoId,
    submission: incidentToSubmission(scenario),
  };
}
