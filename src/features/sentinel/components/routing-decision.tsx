import {
  formatEnvironmentLabel,
  formatEnumLabel,
  formatTimestamp,
} from "@/features/sentinel/components/display-utils";
import type {
  Incident,
  RoutingDecision as Decision,
} from "@/features/sentinel/types";

interface RoutingDecisionProps {
  result: { incident: Incident; decision: Decision } | null;
}

export function RoutingDecision({ result }: RoutingDecisionProps) {
  if (!result) {
    return (
      <section
        className="flex min-h-[360px] flex-col rounded-md border border-border bg-panel"
        aria-labelledby="decision-heading"
      >
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
            Policy output
          </p>
          <h2
            id="decision-heading"
            className="mt-1 text-lg font-semibold text-white"
          >
            Latest routing decision
          </h2>
        </div>
        <div className="grid flex-1 place-items-center p-8 text-center">
          <div className="max-w-sm">
            <div
              className="mx-auto grid size-14 place-items-center rounded-full border border-border bg-surface font-mono text-xl text-muted"
              aria-hidden="true"
            >
              ?
            </div>
            <h3 className="mt-5 text-base font-semibold text-white">
              Awaiting evaluation
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Configure an incident or load a demo scenario, then evaluate it
              against the active deployment policy.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const { incident, decision } = result;
  const isBlocked = decision.status === "BLOCKED";

  return (
    <section
      className={`min-h-[360px] rounded-md border bg-panel ${
        isBlocked ? "border-danger/60" : "border-accent/50"
      }`}
      aria-labelledby="decision-heading"
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
            Policy output
          </p>
          <h2
            id="decision-heading"
            className="mt-1 text-lg font-semibold text-white"
          >
            Latest routing decision
          </h2>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded border px-3 py-1.5 font-mono text-xs font-bold tracking-wider ${
            isBlocked
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-success/40 bg-success/10 text-success"
          }`}
        >
          <span aria-hidden="true">{isBlocked ? "!" : "✓"}</span>
          {decision.status}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        {isBlocked ? (
          <div className="rounded-md border border-danger/25 bg-danger/5 p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-danger">
              Policy enforced
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              No eligible environment
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-accent/25 bg-accent/5 p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
              Selected environment
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {decision.selectedEnvironment
                ? formatEnvironmentLabel(decision.selectedEnvironment)
                : "Unavailable"}
            </p>
          </div>
        )}

        <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">Incident</dt>
            <dd className="mt-1 text-sm font-medium text-white">
              {incident.title}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Classification</dt>
            <dd className="mt-1 font-mono text-xs font-semibold text-foreground">
              {formatEnumLabel(incident.classification)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Network requirement</dt>
            <dd className="mt-1 font-mono text-xs font-semibold text-foreground">
              {formatEnumLabel(incident.requiredNetworkMode)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Policy version</dt>
            <dd className="mt-1 font-mono text-xs font-semibold text-foreground">
              {decision.policyVersion}
            </dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-border pt-5">
          <p className="text-sm leading-6 text-foreground">
            {decision.explanation}
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted">
            Evaluated {formatTimestamp(decision.evaluatedAt)}
          </p>
        </div>
      </div>
    </section>
  );
}
