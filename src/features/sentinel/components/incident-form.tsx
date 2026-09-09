"use client";

import { useState } from "react";

import { formatEnumLabel } from "@/features/sentinel/components/display-utils";
import type {
  Classification,
  Incident,
  IncidentSubmission,
  IncidentType,
  NetworkMode,
  Severity,
} from "@/features/sentinel/types";

interface IncidentFormProps {
  demoIncidents: Incident[];
  onSubmit: (submission: IncidentSubmission) => void | Promise<void>;
  isSubmitting: boolean;
  error: string | null;
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

const INPUT_CLASS_NAME =
  "mt-2 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-muted/60 hover:border-muted/50 focus:border-accent focus:ring-2 focus:ring-accent/15";

export function IncidentForm({
  demoIncidents,
  onSubmit,
  isSubmitting,
  error,
}: IncidentFormProps) {
  const [draft, setDraft] = useState<IncidentDraft>(EMPTY_DRAFT);
  const [selectedDemoId, setSelectedDemoId] = useState("");

  function updateDraft<Field extends keyof IncidentDraft>(
    field: Field,
    value: IncidentDraft[Field],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function loadDemoScenario(id: string) {
    setSelectedDemoId(id);
    const scenario = demoIncidents.find((incident) => incident.id === id);

    if (!scenario) {
      return;
    }

    setDraft({
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

    void onSubmit({
      ...draft,
      sampleContent:
        selectedDemo?.sampleContent ??
        "SYNTHETIC: Local analyst-created demonstration incident.",
    });
  }

  return (
    <section
      className="rounded-md border border-border bg-panel"
      aria-labelledby="incident-form-heading"
    >
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          New evaluation
        </p>
        <h2
          id="incident-form-heading"
          className="mt-1 text-lg font-semibold text-white"
        >
          Submit security incident
        </h2>
        <p className="mt-1 text-sm text-muted">
          Define handling requirements before policy evaluation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
        <div>
          <label
            htmlFor="demo-scenario"
            className="text-xs font-medium text-foreground"
          >
            Load demo scenario
          </label>
          <select
            id="demo-scenario"
            value={selectedDemoId}
            onChange={(event) => loadDemoScenario(event.target.value)}
            className={INPUT_CLASS_NAME}
          >
            <option value="">Select a synthetic scenario</option>
            <option value="INC-DEMO-001">Public CVE Research</option>
            <option value="INC-DEMO-002">
              Confidential Authentication Logs
            </option>
            <option value="INC-DEMO-003">Classified Telemetry</option>
            <option value="INC-DEMO-004">
              Secret External-Network Request
            </option>
          </select>
          <p className="mt-2 text-xs text-muted">
            Loading a scenario only populates the form. Evaluation remains
            manual.
          </p>
        </div>

        <div>
          <label
            htmlFor="incident-title"
            className="text-xs font-medium text-foreground"
          >
            Incident title
          </label>
          <input
            id="incident-title"
            type="text"
            required
            value={draft.title}
            onChange={(event) => updateDraft("title", event.target.value)}
            placeholder="Describe the incident briefly"
            className={INPUT_CLASS_NAME}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="incident-type"
              className="text-xs font-medium text-foreground"
            >
              Incident type
            </label>
            <select
              id="incident-type"
              value={draft.incidentType}
              onChange={(event) =>
                updateDraft("incidentType", event.target.value as IncidentType)
              }
              className={INPUT_CLASS_NAME}
            >
              {INCIDENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {formatEnumLabel(type)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="classification"
              className="text-xs font-medium text-foreground"
            >
              Classification
            </label>
            <select
              id="classification"
              value={draft.classification}
              onChange={(event) =>
                updateDraft(
                  "classification",
                  event.target.value as Classification,
                )
              }
              className={INPUT_CLASS_NAME}
            >
              {CLASSIFICATIONS.map((classification) => (
                <option key={classification} value={classification}>
                  {formatEnumLabel(classification)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="severity"
              className="text-xs font-medium text-foreground"
            >
              Severity
            </label>
            <select
              id="severity"
              value={draft.severity}
              onChange={(event) =>
                updateDraft("severity", event.target.value as Severity)
              }
              className={INPUT_CLASS_NAME}
            >
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {formatEnumLabel(severity)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="network-mode"
              className="text-xs font-medium text-foreground"
            >
              Required network mode
            </label>
            <select
              id="network-mode"
              value={draft.requiredNetworkMode}
              onChange={(event) =>
                updateDraft(
                  "requiredNetworkMode",
                  event.target.value as NetworkMode,
                )
              }
              className={INPUT_CLASS_NAME}
            >
              {NETWORK_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {formatEnumLabel(mode)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="workload"
              className="text-xs font-medium text-foreground"
            >
              Estimated workload
            </label>
            <span className="font-mono text-xs text-accent">
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
            className="mt-3 h-1.5 w-full accent-accent"
          />
          <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
            <span>01</span>
            <span>100</span>
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="text-xs font-medium text-foreground"
          >
            Description
          </label>
          <textarea
            id="description"
            required
            rows={4}
            value={draft.description}
            onChange={(event) =>
              updateDraft("description", event.target.value)
            }
            placeholder="Provide synthetic context for this evaluation"
            className={`${INPUT_CLASS_NAME} resize-y`}
          />
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            Submitted to the SentinelGrid policy engine and classifier
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-[#041512] transition-colors hover:bg-[#62e5d7] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-panel disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span aria-hidden="true">→</span>
            {isSubmitting ? "Evaluating…" : "Evaluate Route"}
          </button>
        </div>
      </form>
    </section>
  );
}
