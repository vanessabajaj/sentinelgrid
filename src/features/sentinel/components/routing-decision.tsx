import {
  formatEnvironmentLabel,
  formatEnumLabel,
  formatTimestamp,
} from "@/features/sentinel/components/display-utils";
import { POLICY_VERSION } from "@/features/sentinel/routing/policy-config";
import type {
  ClassificationSignals,
  WorkloadResult,
} from "@/features/sentinel/types";

interface RoutingDecisionProps {
  result: WorkloadResult | null;
}

const SIGNAL_LABELS: Record<keyof ClassificationSignals, string> = {
  containsPii: "Contains PII",
  containsInternalIps: "Contains internal IPs",
  containsCredentials: "Contains credentials",
  containsClassifiedMarkers: "Contains classified markers",
  requiresExternalNetwork: "Requires external network",
};

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

  const { incident, decision, classification, outcome } = result;
  const isBlocked = outcome === "BLOCKED";
  const isQuarantined = outcome === "QUARANTINED";
  const isFailed = result.executionStatus === "FAILED";

  const badgeClass = isFailed
    ? "border-danger/40 bg-danger/10 text-danger"
    : isQuarantined
    ? "border-warning/40 bg-warning/10 text-warning"
    : isBlocked
      ? "border-danger/40 bg-danger/10 text-danger"
      : "border-success/40 bg-success/10 text-success";
  const badgeIcon = isQuarantined ? "⚑" : isBlocked || isFailed ? "!" : "✓";

  return (
    <section
      className={`min-h-[360px] rounded-md border bg-panel ${
        isFailed
          ? "border-danger/60"
          : isQuarantined
          ? "border-warning/60"
          : isBlocked
            ? "border-danger/60"
            : "border-accent/50"
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
          className={`inline-flex w-fit items-center gap-2 rounded border px-3 py-1.5 font-mono text-xs font-bold tracking-wider ${badgeClass}`}
        >
          <span aria-hidden="true">{badgeIcon}</span>
          {isFailed ? "EXECUTION FAILED" : outcome}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        {isQuarantined ? (
          <div className="rounded-md border border-warning/25 bg-warning/5 p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-warning">
              Classification conflict
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              Job quarantined for review
            </p>
          </div>
        ) : isBlocked ? (
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
              {decision?.selectedEnvironment
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
            <dt className="text-xs text-muted">Declared classification</dt>
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
              {decision?.policyVersion ?? POLICY_VERSION}
            </dd>
          </div>
        </dl>

        {result.workerExecution ? (
          <div className="mt-5 border-t border-border pt-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
              Worker execution
            </p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted">Executed by</dt>
                <dd className="mt-1 text-xs font-semibold text-white">
                  {result.workerExecution.workerName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Execution mode</dt>
                <dd className="mt-1 font-mono text-xs font-semibold text-foreground">
                  {formatEnumLabel(result.workerExecution.executionMode)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Executed environment</dt>
                <dd className="mt-1 font-mono text-xs font-semibold text-foreground">
                  {formatEnvironmentLabel(
                    result.workerExecution.environmentId,
                  )}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        {result.executionFailure ? (
          <div className="mt-5 rounded-md border border-danger/30 bg-danger/5 p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-danger">
              Worker execution failed
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {result.executionFailure.workerName}
            </p>
            <p className="mt-1 text-sm leading-6 text-foreground">
              {result.executionFailure.reason}
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted">
              {formatTimestamp(result.executionFailure.failedAt)}
            </p>
          </div>
        ) : null}

        <div className="mt-5 border-t border-border pt-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            Data classifier
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            Detected classification:{" "}
            <span className="font-mono font-semibold text-white">
              {formatEnumLabel(classification.detectedClassification)}
            </span>
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(SIGNAL_LABELS) as (keyof ClassificationSignals)[])
              .filter((key) => classification[key])
              .map((key) => (
                <li
                  key={key}
                  className="rounded border border-border bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-foreground"
                >
                  {SIGNAL_LABELS[key]}
                </li>
              ))}
            {(Object.keys(SIGNAL_LABELS) as (keyof ClassificationSignals)[]).every(
              (key) => !classification[key],
            ) ? (
              <li className="rounded border border-border bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                No sensitive signals detected
              </li>
            ) : null}
          </ul>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          {isQuarantined ? (
            <p className="text-sm leading-6 text-foreground">
              Declared classification (
              {formatEnumLabel(incident.classification)}) is lower than the
              classification detected from the submitted content (
              {formatEnumLabel(classification.detectedClassification)}). The
              workload was held for manual review instead of being routed.
            </p>
          ) : (
            <p className="text-sm leading-6 text-foreground">
              {decision?.explanation}
            </p>
          )}
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted">
            Evaluated{" "}
            {formatTimestamp(decision?.evaluatedAt ?? incident.submittedAt)}
          </p>
        </div>
      </div>
    </section>
  );
}
