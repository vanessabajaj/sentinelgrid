"use client";

import { useState } from "react";

import { AuditLog } from "@/features/sentinel/components/audit-log";
import { DashboardSummary } from "@/features/sentinel/components/dashboard-summary";
import { EnvironmentGrid } from "@/features/sentinel/components/environment-grid";
import { IncidentAnalysis } from "@/features/sentinel/components/incident-analysis";
import { IncidentForm } from "@/features/sentinel/components/incident-form";
import { PageHeader } from "@/features/sentinel/components/page-header";
import { RoutingDecision } from "@/features/sentinel/components/routing-decision";
import { useSentinelStore } from "@/features/sentinel/store/sentinel-store";
import type {
  Incident,
  RoutingDecision as Decision,
} from "@/features/sentinel/types";

interface SentinelWorkspaceProps {
  demoIncidents: Incident[];
}

export function SentinelWorkspace({ demoIncidents }: SentinelWorkspaceProps) {
  const {
    environments,
    results,
    auditEntries,
    latestResult,
    evaluateIncident,
    previewIncident,
    resetSession,
  } = useSentinelStore();

  const [preview, setPreview] = useState<{
    incident: Incident;
    decision: Decision;
  } | null>(null);

  function handleDraftChange(incident: Incident) {
    setPreview({ incident, decision: previewIncident(incident) });
  }

  function handleEvaluate(incident: Incident) {
    evaluateIncident(incident);
    setPreview(null);
  }

  return (
    <>
      <PageHeader
        eyebrow="Fleet"
        title="One workload, three environments"
        subtitle="Security analysis runs wherever policy allows it. Cloud is cheap and elastic but externally networked; on-prem is a fixed pool; the enclave has no outbound network at all."
      />

      <DashboardSummary entries={auditEntries} />

      <EnvironmentGrid
        environments={environments}
        decision={latestResult?.decision ?? null}
        results={results}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <IncidentForm
          demoIncidents={demoIncidents}
          onEvaluate={handleEvaluate}
          onDraftChange={handleDraftChange}
        />
        <div className="flex flex-col gap-5">
          {/* While the form is being edited the preview wins; once a job is
              submitted the recorded decision takes the panel back. */}
          <RoutingDecision
            result={preview ? null : latestResult}
            previewDecision={preview?.decision ?? null}
            previewIncident={preview?.incident ?? null}
          />
          {preview ? null : <IncidentAnalysis result={latestResult} />}
        </div>
      </div>

      <AuditLog results={results} onResetSession={resetSession} expandable />
    </>
  );
}
