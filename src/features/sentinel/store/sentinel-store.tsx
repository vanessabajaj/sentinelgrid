"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import type { ReactNode } from "react";

import { generateIncidentAnalysis } from "@/features/sentinel/analysis/generate-incident-analysis";
import { mockEnvironments } from "@/data/mock-sentinel-data";
import { evaluateRouting } from "@/features/sentinel/routing/evaluate-routing";
import type {
  AuditEntry,
  Environment,
  Incident,
  IncidentAnalysis as Analysis,
  RoutingDecision as Decision,
} from "@/features/sentinel/types";

export interface EvaluationResult {
  incident: Incident;
  decision: Decision;
  analysis: Analysis | null;
}

/** Environments an operator can knock offline to test the policy's fallbacks. */
export type FaultId = "ON_PREM" | "AIR_GAPPED";

interface SentinelState {
  /** Full evaluation history, newest first. Persisted to this browser only. */
  results: EvaluationResult[];
  faults: Record<FaultId, boolean>;
}

type SentinelAction =
  | { type: "evaluation-completed"; incident: Incident; decision: Decision; analysis: Analysis | null }
  | { type: "hydrate"; results: EvaluationResult[]; faults?: Record<FaultId, boolean> }
  | { type: "toggle-fault"; fault: FaultId }
  | { type: "reset-session" };

const STORAGE_KEY = "sentinelgrid.session.v1";

const NO_FAULTS: Record<FaultId, boolean> = {
  ON_PREM: false,
  AIR_GAPPED: false,
};

const INITIAL_STATE: SentinelState = {
  results: [],
  faults: NO_FAULTS,
};

function sentinelReducer(
  state: SentinelState,
  action: SentinelAction,
): SentinelState {
  switch (action.type) {
    case "evaluation-completed":
      return {
        ...state,
        results: [
          {
            incident: action.incident,
            decision: action.decision,
            analysis: action.analysis,
          },
          ...state.results,
        ],
      };
    case "hydrate":
      return {
        ...state,
        results: action.results,
        faults: action.faults ?? state.faults,
      };
    case "toggle-fault":
      return {
        ...state,
        faults: {
          ...state.faults,
          [action.fault]: !state.faults[action.fault],
        },
      };
    case "reset-session":
      return {
        ...state,
        results: [],
      };
    default:
      return state;
  }
}

/**
 * Applies the operator's fault toggles on top of the fixture environments.
 * A faulted environment is simply offline, so the existing policy checks
 * reject it the same way a real outage would.
 */
function applyFaults(faults: Record<FaultId, boolean>): Environment[] {
  return mockEnvironments.map((environment) =>
    environment.id !== "CLOUD" && faults[environment.id]
      ? { ...environment, online: false }
      : { ...environment },
  );
}

interface SentinelStoreValue {
  environments: Environment[];
  results: EvaluationResult[];
  auditEntries: AuditEntry[];
  latestResult: EvaluationResult | null;
  faults: Record<FaultId, boolean>;
  /** Evaluates without recording — used for the live placement preview. */
  previewIncident: (incident: Incident) => Decision;
  evaluateIncident: (incident: Incident) => EvaluationResult;
  toggleFault: (fault: FaultId) => void;
  resetSession: () => void;
}

const SentinelStoreContext = createContext<SentinelStoreValue | null>(null);

function toAuditEntry(result: EvaluationResult): AuditEntry {
  return {
    decisionId: result.decision.id,
    timestamp: result.decision.evaluatedAt,
    incidentTitle: result.incident.title,
    classification: result.incident.classification,
    outcome: result.decision.status,
    selectedEnvironment: result.decision.selectedEnvironment,
    policyVersion: result.decision.policyVersion,
  };
}

export function SentinelStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sentinelReducer, INITIAL_STATE);

  // Hydrate from localStorage once on mount so navigating between tabs (and
  // reopening the browser) keeps the session's routing history and audit
  // trail intact. Session state never leaves this browser.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          results?: EvaluationResult[];
          faults?: Record<FaultId, boolean>;
        };
        // Tolerate the older shape, which stored a bare results array.
        const results = Array.isArray(saved) ? saved : (saved.results ?? []);
        const faults = Array.isArray(saved) ? undefined : saved.faults;

        if (results.length > 0 || faults) {
          dispatch({ type: "hydrate", results, faults });
        }
      }
    } catch {
      // Corrupt or inaccessible storage falls back to an empty session.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ results: state.results, faults: state.faults }),
      );
    } catch {
      // Storage may be unavailable (private browsing, quota); the in-memory
      // session still works, it just won't survive a refresh.
    }
  }, [state.results, state.faults]);

  const value = useMemo<SentinelStoreValue>(() => {
    const environments = applyFaults(state.faults);
    const auditEntries = state.results.map(toAuditEntry);

    return {
      environments,
      results: state.results,
      auditEntries,
      latestResult: state.results[0] ?? null,
      faults: state.faults,
      previewIncident(incident: Incident) {
        return evaluateRouting(incident, environments);
      },
      evaluateIncident(incident: Incident) {
        const decision = evaluateRouting(incident, environments);
        const analysis =
          decision.status === "ROUTED"
            ? generateIncidentAnalysis(incident)
            : null;
        const result: EvaluationResult = { incident, decision, analysis };

        dispatch({
          type: "evaluation-completed",
          incident,
          decision,
          analysis,
        });

        return result;
      },
      toggleFault(fault: FaultId) {
        dispatch({ type: "toggle-fault", fault });
      },
      resetSession() {
        dispatch({ type: "reset-session" });
      },
    };
  }, [state]);

  return (
    <SentinelStoreContext.Provider value={value}>
      {children}
    </SentinelStoreContext.Provider>
  );
}

export function useSentinelStore(): SentinelStoreValue {
  const context = useContext(SentinelStoreContext);

  if (!context) {
    throw new Error(
      "useSentinelStore must be used within a SentinelStoreProvider.",
    );
  }

  return context;
}
