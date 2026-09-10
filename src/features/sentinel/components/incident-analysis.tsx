import {
  formatClockTime,
  formatEnumLabel,
  formatTimestamp,
} from "@/features/sentinel/components/display-utils";
import type { Severity, WorkloadResult } from "@/features/sentinel/types";

interface IncidentAnalysisProps {
  result: WorkloadResult | null;
}

const SEVERITY_STYLES: Record<Severity, string> = {
  LOW: "border-success/35 bg-success/10 text-success",
  MEDIUM: "border-accent/35 bg-accent/10 text-accent",
  HIGH: "border-warning/35 bg-warning/10 text-warning",
  CRITICAL: "border-danger/35 bg-danger/10 text-danger",
};

export function IncidentAnalysis({ result }: IncidentAnalysisProps) {
  if (!result) {
    return null;
  }

  const isRouted = result.outcome === "ROUTED";
  const notExecutedReason =
    result.executionFailure
      ? result.executionFailure.reason
      : result.outcome === "QUARANTINED"
      ? "Analysis not executed because the workload was quarantined for a classification conflict."
      : "Analysis not executed because policy blocked the workload.";

  return (
    <section
      className={`overflow-hidden rounded-md border bg-panel ${
        isRouted ? "border-border" : "border-warning/45"
      }`}
      aria-labelledby="analysis-heading"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Local response intelligence
          </p>
          <h2
            id="analysis-heading"
            className="mt-1 text-lg font-semibold text-white"
          >
            SentinelAI Analysis
          </h2>
        </div>
        <span className="w-fit rounded border border-border bg-surface px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
          {result.workerExecution
            ? `Executed by: ${result.workerExecution.workerName}`
            : result.executionFailure
              ? "Worker execution failed"
              : "Analysis not dispatched"}
        </span>
      </div>

      {!isRouted || !result.analysis ? (
        <div className="p-5 sm:p-6">
          <div className="flex gap-4 rounded-md border border-warning/30 bg-warning/5 p-4">
            <span
              className="grid size-8 shrink-0 place-items-center rounded border border-warning/35 bg-warning/10 font-mono text-sm font-bold text-warning"
              aria-hidden="true"
            >
              !
            </span>
            <div>
              <p className="text-sm font-semibold text-white">
                Analysis not executed
              </p>
              <p className="mt-1 text-sm leading-6 text-foreground">
                {notExecutedReason}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-surface p-4">
              <p className="text-xs text-muted">Severity</p>
              <span
                className={`mt-2 inline-flex rounded border px-2 py-1 font-mono text-[11px] font-bold tracking-wider ${SEVERITY_STYLES[result.analysis.severity]}`}
              >
                {result.analysis.severity}
              </span>
            </div>
            <div className="rounded-md border border-border bg-surface p-4 sm:col-span-2">
              <p className="text-xs text-muted">Suspected attack</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {result.analysis.suspectedAttackType}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
              Summary
            </h3>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {result.analysis.summary}
            </p>
          </div>

          <div className="mt-5 grid gap-5 border-t border-border pt-5 lg:grid-cols-2">
            <div>
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                Indicators
              </h3>
              <ul className="mt-3 space-y-2.5">
                {result.analysis.indicators.map((indicator) => (
                  <li
                    key={indicator}
                    className="flex gap-3 text-sm leading-5 text-foreground"
                  >
                    <span
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-warning"
                      aria-hidden="true"
                    />
                    {indicator}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                Recommended actions
              </h3>
              <ol className="mt-3 space-y-2.5">
                {result.analysis.recommendedActions.map((action, index) => (
                  <li
                    key={action}
                    className="flex gap-3 text-sm leading-5 text-foreground"
                  >
                    <span className="font-mono text-[11px] font-bold text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {action}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {result.analysis.timeline.length > 0 ? (
            <div className="mt-5 border-t border-border pt-5">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                Attack timeline
              </h3>
              <ol className="mt-3 space-y-3">
                {result.analysis.timeline.map((event) => (
                  <li
                    key={`${event.timestamp}-${event.description}`}
                    className="flex gap-4 text-sm leading-5"
                  >
                    <span className="w-14 shrink-0 font-mono text-[11px] font-semibold text-accent">
                      {formatClockTime(event.timestamp)}
                    </span>
                    <span className="text-foreground">{event.description}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Confidence</span>
                <span className="font-mono font-semibold text-accent">
                  {result.analysis.confidence}%
                </span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"
                role="progressbar"
                aria-label="Analysis confidence"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={result.analysis.confidence}
              >
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${result.analysis.confidence}%` }}
                />
              </div>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
              Generated {formatTimestamp(result.analysis.generatedAt)} · {formatEnumLabel(result.incident.incidentType)}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
