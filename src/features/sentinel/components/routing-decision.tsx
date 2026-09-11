import {
  formatEnvironmentLabel,
  formatEnumLabel,
  formatTimestamp,
} from "@/features/sentinel/components/display-utils";
import { TONES } from "@/features/sentinel/components/tones";
import type {
  Incident,
  RoutingDecision as Decision,
} from "@/features/sentinel/types";

interface RoutingDecisionProps {
  result: { incident: Incident; decision: Decision } | null;
  /** Shown before anything has been evaluated, as a live preview. */
  previewDecision?: Decision | null;
  previewIncident?: Incident | null;
}

export function RoutingDecision({
  result,
  previewDecision,
  previewIncident,
}: RoutingDecisionProps) {
  const incident = result?.incident ?? previewIncident ?? null;
  const decision = result?.decision ?? previewDecision ?? null;
  const isPreview = !result && decision !== null;

  if (!decision || !incident) {
    return (
      <section
        className="flex min-h-[320px] flex-col rounded-[var(--radius-lg)] border border-paper-3 bg-paper-1 shadow-[var(--shadow-2)]"
        aria-labelledby="decision-heading"
      >
        <div className="border-b border-paper-3 px-6 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
            Placement preview
          </div>
          <h2
            id="decision-heading"
            className="mt-1 font-display text-[22px] font-semibold text-ink-1"
          >
            Nothing evaluated yet
          </h2>
        </div>
        <div className="grid flex-1 place-items-center p-8 text-center">
          <p className="max-w-sm font-reading text-base leading-[1.55] text-ink-3">
            Describe a job on the left and policy will show where it would be
            placed — or why it would be refused — before anything is queued.
          </p>
        </div>
      </section>
    );
  }

  const isBlocked = decision.status === "BLOCKED";
  const tone = isBlocked ? TONES.rose : TONES.moss;

  return (
    <section
      className="rounded-[var(--radius-lg)] border bg-paper-1 px-6 py-[22px] shadow-[var(--shadow-2)]"
      style={{ borderColor: isBlocked ? "rgba(184,74,94,0.45)" : "var(--paper-3)" }}
      aria-labelledby="decision-heading"
      aria-live="polite"
    >
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
        {isPreview ? "Placement preview" : "Logged decision"}
      </div>

      <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
        <span
          className="rounded-[var(--radius-pill)] border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em]"
          style={{ background: tone.bg, color: tone.fg, borderColor: tone.bc }}
        >
          {isBlocked ? "Refused" : "Routed"}
        </span>
        <span className="font-mono text-[11px] text-ink-3">
          {isPreview
            ? "nothing queued yet"
            : `decided ${formatTimestamp(decision.evaluatedAt)}`}
        </span>
      </div>

      <h2
        id="decision-heading"
        className="m-0 font-display text-[26px] font-semibold leading-tight text-ink-1"
      >
        {isBlocked
          ? "No eligible environment"
          : formatEnvironmentLabel(decision.selectedEnvironment!)}
      </h2>

      <p className="mt-2.5 mb-0 max-w-[56ch] font-reading text-[17px] leading-[1.55] text-ink-2">
        {decision.explanation}
      </p>

      <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-paper-3 pt-4 sm:grid-cols-2">
        <div>
          <dt className="font-mono text-[11px] text-ink-4">job</dt>
          <dd className="m-0 mt-1 text-sm font-medium text-ink-1">
            {incident.title || "untitled job"}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] text-ink-4">classification</dt>
          <dd className="m-0 mt-1 font-mono text-xs font-semibold text-ink-2">
            {formatEnumLabel(incident.classification)}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] text-ink-4">network</dt>
          <dd className="m-0 mt-1 font-mono text-xs font-semibold text-ink-2">
            {formatEnumLabel(incident.requiredNetworkMode)}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] text-ink-4">policy</dt>
          <dd className="m-0 mt-1 font-mono text-xs font-semibold text-ink-2">
            {decision.policyVersion}
          </dd>
        </div>
      </dl>
    </section>
  );
}
