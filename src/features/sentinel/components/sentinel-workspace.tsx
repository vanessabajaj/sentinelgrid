"use client";

import { useCallback, useReducer } from "react";

import { AuditLog } from "@/features/sentinel/components/audit-log";
import { DashboardSummary } from "@/features/sentinel/components/dashboard-summary";
import { DeploymentPanel } from "@/features/sentinel/components/deployment-panel";
import { EnvironmentGrid } from "@/features/sentinel/components/environment-grid";
import { IncidentAnalysis } from "@/features/sentinel/components/incident-analysis";
import { IncidentForm } from "@/features/sentinel/components/incident-form";
import { RoutingDecision } from "@/features/sentinel/components/routing-decision";
import { POLICY_VERSION } from "@/features/sentinel/routing/policy-config";
import type {
  AuditEntry,
  Environment,
  Incident,
  IncidentSubmission,
  WorkloadResult,
} from "@/features/sentinel/types";

interface SentinelWorkspaceProps {
  initialEnvironments: Environment[];
  initialAuditEntries: AuditEntry[];
  demoIncidents: Incident[];
}

interface WorkspaceState {
  environments: Environment[];
  latestResult: WorkloadResult | null;
  auditEntries: AuditEntry[];
  isSubmitting: boolean;
  error: string | null;
}

type WorkspaceAction =
  | { type: "submission-started" }
  | { type: "submission-failed"; message: string }
  | {
      type: "submission-completed";
      result: WorkloadResult;
      environments: Environment[];
    };

function toAuditEntry(result: WorkloadResult): AuditEntry {
  return {
    decisionId: result.decision?.id ?? `quarantine:${result.incident.id}`,
    timestamp: result.incident.submittedAt,
    incidentTitle: result.incident.title,
    classification: result.incident.classification,
    outcome: result.outcome,
    selectedEnvironment: result.decision?.selectedEnvironment ?? null,
    policyVersion: result.decision?.policyVersion ?? POLICY_VERSION,
  };
}

function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case "submission-started":
      return { ...state, isSubmitting: true, error: null };
    case "submission-failed":
      return { ...state, isSubmitting: false, error: action.message };
    case "submission-completed":
      return {
        ...state,
        isSubmitting: false,
        error: null,
        environments: action.environments,
        latestResult: action.result,
        auditEntries: [toAuditEntry(action.result), ...state.auditEntries],
      };
    default:
      return state;
  }
}

export function SentinelWorkspace({
  initialEnvironments,
  initialAuditEntries,
  demoIncidents,
}: SentinelWorkspaceProps) {
  const [state, dispatch] = useReducer(workspaceReducer, {
    environments: initialEnvironments,
    latestResult: null,
    auditEntries: initialAuditEntries,
    isSubmitting: false,
    error: null,
  });

  const handleSubmit = useCallback(async (submission: IncidentSubmission) => {
    dispatch({ type: "submission-started" });

    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });

      const payload: { result?: WorkloadResult; environments?: Environment[]; error?: string } =
        await response.json();

      if (!response.ok || !payload.result || !payload.environments) {
        dispatch({
          type: "submission-failed",
          message: payload.error ?? "The evaluation request failed.",
        });
        return;
      }

      dispatch({
        type: "submission-completed",
        result: payload.result,
        environments: payload.environments,
      });
    } catch {
      dispatch({
        type: "submission-failed",
        message: "Could not reach the SentinelGrid control plane.",
      });
    }
  }, []);

  return (
    <div className="space-y-8">
      <DashboardSummary entries={state.auditEntries} />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <IncidentForm
          demoIncidents={demoIncidents}
          onSubmit={handleSubmit}
          isSubmitting={state.isSubmitting}
          error={state.error}
        />
        <RoutingDecision result={state.latestResult} />
      </div>

      <IncidentAnalysis result={state.latestResult} />

      <EnvironmentGrid
        environments={state.environments}
        decision={state.latestResult?.decision ?? null}
      />

      <DeploymentPanel />

      <AuditLog entries={state.auditEntries} />
    </div>
  );
}
