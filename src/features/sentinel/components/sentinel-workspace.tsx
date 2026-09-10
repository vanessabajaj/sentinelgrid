"use client";

import { useCallback, useEffect, useReducer } from "react";

import { AuditLog } from "@/features/sentinel/components/audit-log";
import { DashboardSummary } from "@/features/sentinel/components/dashboard-summary";
import { DeploymentPanel } from "@/features/sentinel/components/deployment-panel";
import { EnvironmentGrid } from "@/features/sentinel/components/environment-grid";
import { IncidentAnalysis } from "@/features/sentinel/components/incident-analysis";
import { IncidentForm } from "@/features/sentinel/components/incident-form";
import { RecentWorkloads } from "@/features/sentinel/components/recent-workloads";
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
  demoIncidents: Incident[];
}

interface WorkspaceState {
  environments: Environment[];
  latestResult: WorkloadResult | null;
  auditEntries: AuditEntry[];
  workloads: WorkloadResult[];
  isHydrating: boolean;
  isSubmitting: boolean;
  error: string | null;
}

type WorkspaceAction =
  | {
      type: "hydration-completed";
      environments: Environment[];
      auditEntries: AuditEntry[];
      workloads: WorkloadResult[];
    }
  | { type: "hydration-failed" }
  | { type: "submission-started" }
  | { type: "submission-failed"; message: string }
  | {
      type: "submission-completed";
      result: WorkloadResult;
      environments: Environment[];
    }
  | { type: "workload-selected"; workload: WorkloadResult };

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
    case "hydration-completed":
      return {
        ...state,
        environments: action.environments,
        auditEntries: action.auditEntries,
        workloads: action.workloads,
        latestResult: action.workloads[0] ?? null,
        isHydrating: false,
      };
    case "hydration-failed":
      return {
        ...state,
        isHydrating: false,
        error: "Could not refresh the current in-memory control-plane state.",
      };
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
        workloads: [action.result, ...state.workloads],
      };
    case "workload-selected":
      return { ...state, latestResult: action.workload };
    default:
      return state;
  }
}

export function SentinelWorkspace({
  demoIncidents,
}: SentinelWorkspaceProps) {
  const [state, dispatch] = useReducer(workspaceReducer, {
    environments: [],
    latestResult: null,
    auditEntries: [],
    workloads: [],
    isHydrating: true,
    isSubmitting: false,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function hydrateRuntimeState() {
      try {
        const [incidentsResponse, environmentsResponse, auditResponse] =
          await Promise.all([
            fetch("/api/incidents", {
              cache: "no-store",
              signal: controller.signal,
            }),
            fetch("/api/environments", {
              cache: "no-store",
              signal: controller.signal,
            }),
            fetch("/api/audit", {
              cache: "no-store",
              signal: controller.signal,
            }),
          ]);

        if (
          !incidentsResponse.ok ||
          !environmentsResponse.ok ||
          !auditResponse.ok
        ) {
          throw new Error("Runtime state request failed.");
        }

        const [incidentsPayload, environmentsPayload, auditPayload] =
          await Promise.all([
            incidentsResponse.json() as Promise<{
              workloads: WorkloadResult[];
            }>,
            environmentsResponse.json() as Promise<{
              environments: Environment[];
            }>,
            auditResponse.json() as Promise<{ entries: AuditEntry[] }>,
          ]);

        dispatch({
          type: "hydration-completed",
          environments: environmentsPayload.environments,
          auditEntries: auditPayload.entries,
          workloads: incidentsPayload.workloads,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        dispatch({ type: "hydration-failed" });
      }
    }

    void hydrateRuntimeState();

    return () => {
      controller.abort();
    };
  }, []);

  const handleSelectWorkload = useCallback((workload: WorkloadResult) => {
    dispatch({ type: "workload-selected", workload });
  }, []);

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

  if (state.isHydrating) {
    return (
      <section
        className="rounded-md border border-border bg-panel px-6 py-14 text-center"
        aria-live="polite"
        aria-busy="true"
      >
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Runtime synchronization
        </p>
        <p className="mt-3 text-sm font-medium text-white">
          Loading current in-memory control-plane state…
        </p>
      </section>
    );
  }

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

      <RecentWorkloads
        workloads={state.workloads}
        selectedIncidentId={state.latestResult?.incident.id ?? null}
        onSelect={handleSelectWorkload}
      />

      <AuditLog entries={state.auditEntries} />
    </div>
  );
}
