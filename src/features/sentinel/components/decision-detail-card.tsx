"use client";

import { useState } from "react";

import {
  formatEnumLabel,
  formatEnvironmentLabel,
  formatTimestamp,
} from "@/features/sentinel/components/display-utils";
import { environmentTone, TONES } from "@/features/sentinel/components/tones";
import type { EvaluationResult } from "@/features/sentinel/store/sentinel-store";
import type { EnvironmentId } from "@/features/sentinel/types";

interface DecisionDetailCardProps {
  result: EvaluationResult;
  /** When set, that environment's sieve card is emphasised. */
  focusEnvironmentId?: EnvironmentId;
}

type TraceView = "ladder" | "sieve";

export function DecisionDetailCard({
  result,
  focusEnvironmentId,
}: DecisionDetailCardProps) {
  const [view, setView] = useState<TraceView>("ladder");
  const { incident, decision } = result;
  const isBlocked = decision.status === "BLOCKED";
  const verdictTone = isBlocked ? TONES.rose : TONES.moss;

  const requestLines = [
    { k: "id", v: incident.id },
    { k: "task", v: formatEnumLabel(incident.incidentType).toLowerCase() },
    { k: "class", v: incident.classification.toLowerCase() },
    {
      k: "network",
      v:
        incident.requiredNetworkMode === "NONE"
          ? "no egress required"
          : `requires ${incident.requiredNetworkMode.toLowerCase()} egress`,
    },
    { k: "needs", v: `${incident.estimatedWorkload} capacity units` },
    { k: "severity", v: incident.severity.toLowerCase() },
  ];

  return (
    <article
      className="rounded-[var(--radius-lg)] border bg-paper-1 p-5 shadow-[var(--shadow-2)] sm:p-6"
      style={{ borderColor: isBlocked ? "rgba(184,74,94,0.45)" : "var(--paper-3)" }}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <div className="rounded-[var(--radius-lg)] border border-paper-3 bg-paper-2 px-5 py-4 shadow-[var(--shadow-inset)]">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
            Request
          </div>
          <dl className="flex flex-col gap-[7px]">
            {requestLines.map((line) => (
              <div
                key={line.k}
                className="grid grid-cols-[62px_minmax(0,1fr)] gap-2.5 font-mono text-[12.5px] leading-[1.45]"
              >
                <dt className="text-ink-4">{line.k}</dt>
                <dd className="m-0 text-ink-2">{line.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="min-w-0">
          <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
            <span
              className="rounded-[var(--radius-pill)] border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em]"
              style={{
                background: verdictTone.bg,
                color: verdictTone.fg,
                borderColor: verdictTone.bc,
              }}
            >
              {isBlocked ? "Refused" : "Routed"}
            </span>
            <span className="font-mono text-[11px] text-ink-3">
              {decision.evaluations.length} environments evaluated ·{" "}
              {formatTimestamp(decision.evaluatedAt)}
            </span>
          </div>

          <h3 className="m-0 font-display text-[28px] font-semibold leading-tight tracking-[-0.01em] text-ink-1">
            {isBlocked
              ? "No environment satisfies the policy"
              : `${formatEnvironmentLabel(decision.selectedEnvironment!)} · ${incident.title}`}
          </h3>
          <p className="mt-2.5 mb-0 max-w-[60ch] font-reading text-lg leading-[1.55] text-ink-2">
            {decision.explanation}
          </p>
          <div className="mt-3.5 border-t border-paper-3 pt-3 font-mono text-[11px] leading-[1.6] text-ink-3">
            logged · decision={isBlocked ? "refuse" : "route"} target=
            {decision.selectedEnvironment?.toLowerCase() ?? "none"} class=
            {incident.classification.toLowerCase()} policy=
            {decision.policyVersion} actor={incident.id}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-3">
          View
        </span>
        {(
          [
            ["ladder", "Check ladder"],
            ["sieve", "Candidate sieve"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            aria-pressed={view === key}
            className={`rounded-[10px] border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              view === key
                ? "border-ink-1 bg-ink-1 text-paper-0"
                : "border-paper-4 bg-paper-0 text-ink-1 hover:bg-paper-2"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "ladder" ? (
        <ol className="mt-4 flex list-none flex-col gap-0 p-0">
          {decision.evaluations.flatMap((evaluation) =>
            evaluation.checks.map((check) => {
              const passed = check.passed;
              const envTone = environmentTone(evaluation.environmentId);

              return (
                <li
                  key={`${evaluation.environmentId}-${check.name}`}
                  className="grid grid-cols-[34px_minmax(0,1fr)] gap-4"
                >
                  <div className="flex flex-col items-center">
                    <span
                      className="flex size-[26px] flex-none items-center justify-center rounded-full border font-mono text-[11px]"
                      style={{
                        background: passed
                          ? "var(--accent-moss-tint)"
                          : "var(--accent-rose-tint)",
                        color: passed
                          ? "var(--accent-moss-ink)"
                          : "var(--accent-rose-ink)",
                        borderColor: passed
                          ? "rgba(92,122,79,0.4)"
                          : "rgba(184,74,94,0.4)",
                      }}
                      aria-hidden="true"
                    >
                      {passed ? "✓" : "✕"}
                    </span>
                    <span className="min-h-[14px] w-px flex-1 bg-paper-3" />
                  </div>
                  <div className="min-w-0 pb-4">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span
                        className="rounded-[var(--radius-pill)] border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]"
                        style={{
                          background: envTone.bg,
                          color: envTone.fg,
                          borderColor: envTone.bc,
                        }}
                      >
                        {formatEnvironmentLabel(evaluation.environmentId)}
                      </span>
                      <span className="text-[15px] font-semibold text-ink-1">
                        {check.name}
                      </span>
                      <span className="font-mono text-[11px] text-ink-3">
                        {passed ? "passed" : "failed"}
                      </span>
                    </div>
                    <div className="mt-1.5 font-mono text-[11.5px] leading-[1.65] text-ink-3">
                      {check.reason}
                    </div>
                  </div>
                </li>
              );
            }),
          )}
        </ol>
      ) : (
        <div className="mt-4 grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
          {decision.evaluations.map((evaluation) => {
            const envTone = environmentTone(evaluation.environmentId);
            const isPlaced =
              decision.selectedEnvironment === evaluation.environmentId;
            const isFocused =
              isPlaced || evaluation.environmentId === focusEnvironmentId;

            return (
              <div
                key={evaluation.environmentId}
                className="rounded-[var(--radius-lg)] border bg-paper-1 px-5 py-[18px] shadow-[var(--shadow-1)]"
                style={{
                  borderColor: isPlaced
                    ? "rgba(92,122,79,0.45)"
                    : evaluation.eligible
                      ? "var(--paper-3)"
                      : "rgba(184,74,94,0.3)",
                  opacity: isFocused || evaluation.eligible ? 1 : 0.55,
                }}
              >
                <div className="mb-3 flex items-center justify-between gap-2.5">
                  <span
                    className="rounded-[var(--radius-pill)] border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em]"
                    style={{
                      background: envTone.bg,
                      color: envTone.fg,
                      borderColor: envTone.bc,
                    }}
                  >
                    {formatEnvironmentLabel(evaluation.environmentId)}
                  </span>
                  <span
                    className="font-mono text-[11px]"
                    style={{
                      color: isPlaced
                        ? "var(--accent-moss-ink)"
                        : evaluation.eligible
                          ? "var(--ink-3)"
                          : "var(--accent-rose-ink)",
                    }}
                  >
                    {isPlaced
                      ? "placed here"
                      : evaluation.eligible
                        ? "eligible"
                        : "ruled out"}
                  </span>
                </div>
                <ul className="flex list-none flex-col gap-[7px] p-0">
                  {evaluation.checks.map((check) => (
                    <li
                      key={check.name}
                      className="flex items-baseline gap-2.5 font-mono text-[11.5px] leading-[1.5]"
                    >
                      <span
                        className="flex-none"
                        style={{
                          color: check.passed
                            ? "var(--accent-moss)"
                            : "var(--accent-rose)",
                        }}
                        aria-hidden="true"
                      >
                        {check.passed ? "✓" : "✕"}
                      </span>
                      <span className="text-ink-2">
                        {check.name.toLowerCase()} — {check.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
