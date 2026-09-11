"use client";

import { useState } from "react";

import { formatEnumLabel } from "@/features/sentinel/components/display-utils";
import type {
  Classification,
  Incident,
  IncidentType,
  NetworkMode,
  Severity,
} from "@/features/sentinel/types";

interface IncidentFormProps {
  demoIncidents: Incident[];
  onEvaluate: (incident: Incident) => void;
  /** Called on every edit so the caller can preview placement live. */
  onDraftChange?: (incident: Incident) => void;
}

type IncidentDraft = Omit<Incident, "id" | "sampleContent" | "submittedAt">;

const INCIDENT_TYPES: IncidentType[] = [
  "FIREWALL_LOG",
  "AUTHENTICATION_LOG",
  "CVE_ANALYSIS",
  "THREAT_INTELLIGENCE",
  "CLASSIFIED_TELEMETRY",
];
const CLASSIFICATIONS: Classification[] = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "SECRET",
  "CLASSIFIED",
];
const SEVERITIES: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const NETWORK_MODES: NetworkMode[] = ["NONE", "CONTROLLED", "EXTERNAL"];

const EMPTY_DRAFT: IncidentDraft = {
  title: "",
  description: "",
  incidentType: "FIREWALL_LOG",
  classification: "PUBLIC",
  severity: "MEDIUM",
  requiredNetworkMode: "NONE",
  estimatedWorkload: 10,
};

const FIELD_CLASS =
  "mt-1.5 w-full rounded-[var(--radius-sm)] border border-paper-4 bg-paper-0 px-3.5 py-2.5 text-[15px] text-ink-1 outline-none transition-colors placeholder:text-ink-4 focus:border-ink-1";

const LABEL_CLASS =
  "text-xs font-semibold uppercase tracking-[0.08em] text-ink-3";

function pillClass(active: boolean) {
  return `rounded-[var(--radius-pill)] border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
    active
      ? "border-ink-1 bg-ink-1 text-paper-0"
      : "border-paper-3 bg-paper-0 text-ink-2 hover:bg-paper-2"
  }`;
}

export function IncidentForm({
  demoIncidents,
  onEvaluate,
  onDraftChange,
}: IncidentFormProps) {
  const [draft, setDraft] = useState<IncidentDraft>(EMPTY_DRAFT);
  const [selectedDemoId, setSelectedDemoId] = useState("");

  function applyDraft(next: IncidentDraft) {
    setDraft(next);
    onDraftChange?.({
      ...next,
      id: "PREVIEW",
      sampleContent: "",
      submittedAt: new Date().toISOString(),
    });
  }

  function updateDraft<Field extends keyof IncidentDraft>(
    field: Field,
    value: IncidentDraft[Field],
  ) {
    applyDraft({ ...draft, [field]: value });
  }

  function loadDemoScenario(id: string) {
    setSelectedDemoId(id);
    const scenario = demoIncidents.find((incident) => incident.id === id);

    if (!scenario) {
      return;
    }

    applyDraft({
      title: scenario.title,
      description: scenario.description,
      incidentType: scenario.incidentType,
      classification: scenario.classification,
      severity: scenario.severity,
      requiredNetworkMode: scenario.requiredNetworkMode,
      estimatedWorkload: scenario.estimatedWorkload,
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedDemo = demoIncidents.find(
      (incident) => incident.id === selectedDemoId,
    );

    onEvaluate({
      ...draft,
      id: `JOB-${Date.now()}`,
      sampleContent:
        selectedDemo?.sampleContent ??
        "SYNTHETIC: Local analyst-created demonstration job.",
      submittedAt: new Date().toISOString(),
    });
  }

  return (
    <section
      className="rounded-[var(--radius-lg)] border border-paper-3 bg-paper-1 px-6 py-[22px] shadow-[var(--shadow-2)]"
      aria-labelledby="incident-form-heading"
    >
      <h2
        id="incident-form-heading"
        className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3"
      >
        New job
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="demo-scenario" className={LABEL_CLASS}>
            Load a scenario
          </label>
          <select
            id="demo-scenario"
            value={selectedDemoId}
            onChange={(event) => loadDemoScenario(event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Choose a synthetic scenario…</option>
            {demoIncidents.map((incident) => (
              <option key={incident.id} value={incident.id}>
                {incident.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="incident-title" className={LABEL_CLASS}>
            Name
          </label>
          <input
            id="incident-title"
            type="text"
            required
            value={draft.title}
            onChange={(event) => updateDraft("title", event.target.value)}
            placeholder="claims-summary-nightly"
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="incident-type" className={LABEL_CLASS}>
            Workload type
          </label>
          <select
            id="incident-type"
            value={draft.incidentType}
            onChange={(event) =>
              updateDraft("incidentType", event.target.value as IncidentType)
            }
            className={FIELD_CLASS}
          >
            {INCIDENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatEnumLabel(type)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <span className={LABEL_CLASS}>Data classification</span>
          <div className="flex flex-wrap gap-2">
            {CLASSIFICATIONS.map((classification) => (
              <button
                key={classification}
                type="button"
                onClick={() => updateDraft("classification", classification)}
                aria-pressed={draft.classification === classification}
                className={pillClass(draft.classification === classification)}
              >
                {classification.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={LABEL_CLASS}>Network requirement</span>
          <div className="flex flex-wrap gap-2">
            {NETWORK_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => updateDraft("requiredNetworkMode", mode)}
                aria-pressed={draft.requiredNetworkMode === mode}
                className={pillClass(draft.requiredNetworkMode === mode)}
              >
                {mode === "NONE"
                  ? "no egress"
                  : mode === "CONTROLLED"
                    ? "brokered egress"
                    : "external network"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={LABEL_CLASS}>Severity</span>
          <div className="flex flex-wrap gap-2">
            {SEVERITIES.map((severity) => (
              <button
                key={severity}
                type="button"
                onClick={() => updateDraft("severity", severity)}
                aria-pressed={draft.severity === severity}
                className={pillClass(draft.severity === severity)}
              >
                {severity.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="workload" className={LABEL_CLASS}>
              Capacity needed
            </label>
            <span className="font-mono text-xs text-ink-2">
              {draft.estimatedWorkload} units
            </span>
          </div>
          <input
            id="workload"
            type="range"
            min="1"
            max="100"
            step="1"
            value={draft.estimatedWorkload}
            onChange={(event) =>
              updateDraft("estimatedWorkload", Number(event.target.value))
            }
            className="mt-3 h-1.5 w-full accent-[var(--accent-honey)]"
          />
        </div>

        <div>
          <label htmlFor="description" className={LABEL_CLASS}>
            Description
          </label>
          <textarea
            id="description"
            required
            rows={3}
            value={draft.description}
            onChange={(event) => updateDraft("description", event.target.value)}
            placeholder="Synthetic context for this evaluation"
            className={`${FIELD_CLASS} resize-y`}
          />
        </div>

        <p className="m-0 border-t border-paper-3 pt-3.5 font-reading text-base leading-[1.55] text-ink-3">
          Placement is previewed alongside before the job is queued. Nothing
          runs until you submit.
        </p>

        <div>
          <button
            type="submit"
            className="rounded-[var(--radius-md)] border border-[#B88C1F] bg-[var(--accent-honey)] px-[18px] py-2.5 text-sm font-semibold text-[var(--accent-honey-ink)] shadow-[var(--shadow-inset),var(--shadow-1)] transition-colors hover:bg-[#C89632]"
          >
            Submit job
          </button>
        </div>
      </form>
    </section>
  );
}
