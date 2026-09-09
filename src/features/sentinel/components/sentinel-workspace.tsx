"use client";

import { useReducer } from "react";

import { AuditLog } from "@/features/sentinel/components/audit-log";
import { DashboardSummary } from "@/features/sentinel/components/dashboard-summary";
import { EnvironmentGrid } from "@/features/sentinel/components/environment-grid";
import { IncidentAnalysis } from "@/features/sentinel/components/incident-analysis";
import { IncidentForm } from "@/features/sentinel/components/incident-form";
import { RoutingDecision } from "@/features/sentinel/components/routing-decision";
import { generateIncidentAnalysis } from "@/features/sentinel/analysis/generate-incident-analysis";
import { evaluateRouting } from "@/features/sentinel/routing/evaluate-routing";
import type {
  AuditEntry,
  Environment,
  Incident,
  IncidentAnalysis as Analysis,
  RoutingDecision as Decision,
} from "@/features/sentinel/types";

interface SentinelWorkspaceProps {
  environments: Environment[];
  demoIncidents: Incident[];
}

interface WorkspaceState {
  latestResult: {
    incident: Incident;
    decision: Decision;
    analysis: Analysis | null;
  } | null;
  auditEntries: AuditEntry[];
}

type WorkspaceAction = {
  type: "evaluation-completed";
  incident: Incident;
  decision: Decision;
  analysis: Analysis | null;
};

const INITIAL_STATE: WorkspaceState = {
  latestResult: null,
  auditEntries: [],
};

function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  const auditEntry: AuditEntry = {
    decisionId: action.decision.id,
    timestamp: action.decision.evaluatedAt,
    incidentTitle: action.incident.title,
    classification: action.incident.classification,
    outcome: action.decision.status,
    selectedEnvironment: action.decision.selectedEnvironment,
    policyVersion: action.decision.policyVersion,
  };

  return {
    latestResult: {
      incident: action.incident,
      decision: action.decision,
      analysis: action.analysis,
    },
    auditEntries: [auditEntry, ...state.auditEntries],
  };
}

export function SentinelWorkspace({
  environments,
  demoIncidents,
}: SentinelWorkspaceProps) {
  const [state, dispatch] = useReducer(workspaceReducer, INITIAL_STATE);

  function handleEvaluation(incident: Incident) {
    const decision = evaluateRouting(incident, environments);
    const analysis =
      decision.status === "ROUTED"
        ? generateIncidentAnalysis(incident)
        : null;

    dispatch({ type: "evaluation-completed", incident, decision, analysis });
  }

  return (
    <div className="space-y-8">
      <DashboardSummary entries={state.auditEntries} />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <IncidentForm
          demoIncidents={demoIncidents}
          onEvaluate={handleEvaluation}
        />
        <RoutingDecision result={state.latestResult} />
      </div>

      <IncidentAnalysis result={state.latestResult} />

      <EnvironmentGrid
        environments={environments}
        decision={state.latestResult?.decision ?? null}
      />

      <AuditLog entries={state.auditEntries} />
    </div>
  );
}
