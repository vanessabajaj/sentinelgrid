import {
  formatEnumLabel,
  formatTimestamp,
} from "@/features/sentinel/components/display-utils";
import { TONES } from "@/features/sentinel/components/tones";
import type { ToneName } from "@/features/sentinel/components/tones";
import type {
  Incident,
  IncidentAnalysis as Analysis,
  RoutingDecision,
  Severity,
} from "@/features/sentinel/types";

interface IncidentAnalysisProps {
  result: {
    incident: Incident;
    decision: RoutingDecision;
    analysis: Analysis | null;
  } | null;
}

const SEVERITY_TONE: Record<Severity, ToneName> = {
  LOW: "moss",
  MEDIUM: "ocean",
  HIGH: "clay",
  CRITICAL: "rose",
};

export function IncidentAnalysis({ result }: IncidentAnalysisProps) {
  if (!result) {
    return null;
  }

  const isBlocked = result.decision.status === "BLOCKED";

  if (isBlocked || !result.analysis) {
    return (
      <section
        className="rounded-[var(--radius-lg)] border px-[22px] py-5 shadow-[var(--shadow-inset)]"
        style={{
          background: "var(--accent-clay-tint)",
          borderColor: "rgba(194,90,46,0.25)",
        }}
        aria-labelledby="analysis-heading"
      >
        <h2
          id="analysis-heading"
          className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--accent-clay-ink)]"
        >
          Analysis not executed
        </h2>
        <p className="m-0 font-reading text-base leading-[1.5] text-[var(--accent-clay-ink)]">
          The job never reached an environment, so no model ran on it. Policy
          refused the placement and the refusal is what was recorded.
        </p>
      </section>
    );
  }

  const analysis = result.analysis;
  const tone = TONES[SEVERITY_TONE[analysis.severity]];

  return (
    <section
      className="rounded-[var(--radius-lg)] border border-paper-3 bg-paper-1 px-6 py-[22px] shadow-[var(--shadow-2)]"
      aria-labelledby="analysis-heading"
      aria-live="polite"
    >
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="analysis-heading"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3"
        >
          Workload output · simulated local analysis
        </h2>
        <span className="font-mono text-[11px] text-ink-3">
          {formatTimestamp(analysis.generatedAt)} ·{" "}
          {formatEnumLabel(result.incident.incidentType)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className="rounded-[var(--radius-pill)] border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em]"
          style={{ background: tone.bg, color: tone.fg, borderColor: tone.bc }}
        >
          {analysis.severity.toLowerCase()}
        </span>
        <span className="font-display text-[19px] font-semibold text-ink-1">
          {analysis.suspectedAttackType}
        </span>
      </div>

      <p className="mt-2.5 mb-0 max-w-[70ch] font-reading text-[17px] leading-[1.55] text-ink-2">
        {analysis.summary}
      </p>

      <div className="mt-4 grid gap-5 border-t border-paper-3 pt-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Indicators
          </h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {analysis.indicators.map((indicator) => (
              <li
                key={indicator}
                className="flex gap-2.5 font-mono text-[11.5px] leading-[1.6] text-ink-2"
              >
                <span
                  className="mt-1.5 size-1.5 flex-none rounded-full"
                  style={{ background: "var(--accent-clay)" }}
                  aria-hidden="true"
                />
                {indicator}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Recommended actions
          </h3>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {analysis.recommendedActions.map((action, index) => (
              <li
                key={action}
                className="flex gap-2.5 text-sm leading-[1.5] text-ink-2"
              >
                <span className="font-mono text-[11px] font-semibold text-ink-4">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {action}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-paper-3 pt-4">
        <span className="text-[13px] text-ink-3">Confidence</span>
        <div
          className="h-[7px] w-40 overflow-hidden rounded-[var(--radius-pill)] bg-paper-2 shadow-[var(--shadow-inset)]"
          role="progressbar"
          aria-label="Analysis confidence"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={analysis.confidence}
        >
          <div
            className="h-full"
            style={{
              width: `${analysis.confidence}%`,
              background: "var(--accent-honey)",
            }}
          />
        </div>
        <span className="font-mono text-[13px] font-semibold text-ink-2">
          {analysis.confidence}%
        </span>
      </div>
    </section>
  );
}
