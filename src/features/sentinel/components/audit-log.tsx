"use client";

import { useState } from "react";

import {
  formatEnvironmentLabel,
  formatTimestamp,
} from "@/features/sentinel/components/display-utils";
import { environmentTone, TONES } from "@/features/sentinel/components/tones";
import type { EvaluationResult } from "@/features/sentinel/store/sentinel-store";
import { DecisionDetailCard } from "@/features/sentinel/components/decision-detail-card";

interface AuditLogProps {
  results: EvaluationResult[];
  onResetSession?: () => void;
  /** Expands a row into its full trace when opened. */
  expandable?: boolean;
}

type Filter = "all" | "CLOUD" | "ON_PREM" | "AIR_GAPPED" | "BLOCKED";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "CLOUD", label: "Cloud" },
  { key: "ON_PREM", label: "On-prem" },
  { key: "AIR_GAPPED", label: "Air-gapped" },
  { key: "BLOCKED", label: "Refused" },
];

export function AuditLog({
  results,
  onResetSession,
  expandable = false,
}: AuditLogProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = results.filter((result) => {
    if (filter === "all") return true;
    if (filter === "BLOCKED") return result.decision.status === "BLOCKED";
    return result.decision.selectedEnvironment === filter;
  });

  return (
    <section aria-labelledby="audit-heading" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id="audit-heading"
          className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3"
        >
          Request stream
        </h2>
        {FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            aria-pressed={filter === option.key}
            className={`rounded-[var(--radius-pill)] border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              filter === option.key
                ? "border-ink-1 bg-ink-1 text-paper-0"
                : "border-paper-3 bg-paper-0 text-ink-2 hover:bg-paper-2"
            }`}
          >
            {option.label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-3 font-mono text-[11px] text-ink-3">
          {rows.length} of {results.length} this session
          {onResetSession ? (
            <button
              type="button"
              onClick={onResetSession}
              disabled={results.length === 0}
              className="rounded-[10px] border border-paper-4 bg-paper-0 px-3 py-1.5 font-sans text-[13px] font-semibold text-ink-1 transition-colors hover:bg-paper-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset session
            </button>
          ) : null}
        </span>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-paper-3 bg-paper-1 shadow-[var(--shadow-2)]">
        <div className="grid grid-cols-[96px_minmax(0,1.6fr)_108px_minmax(0,1.5fr)] gap-3 border-b border-paper-3 bg-paper-2 px-[18px] py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
          <span>Time</span>
          <span>Job</span>
          <span>Class</span>
          <span>Placed / reason</span>
        </div>

        {rows.length === 0 ? (
          <p className="px-[18px] py-10 text-center font-reading text-base text-ink-3">
            {results.length === 0
              ? "No decisions yet — submit a job and every routing decision lands here."
              : "No decisions match this filter."}
          </p>
        ) : (
          rows.map((result) => {
            const { decision, incident } = result;
            const isBlocked = decision.status === "BLOCKED";
            const tone = isBlocked
              ? TONES.rose
              : environmentTone(decision.selectedEnvironment!);
            const isOpen = openId === decision.id;

            const rowContent = (
              <>
                <span className="font-mono text-[11.5px] text-ink-3">
                  {new Date(decision.evaluatedAt).toLocaleTimeString("en", {
                    hour12: false,
                  })}
                </span>
                <span className="truncate font-mono text-xs text-ink-1">
                  {incident.title || incident.id}
                </span>
                <span className="font-mono text-[11.5px] text-ink-2">
                  {incident.classification.toLowerCase()}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-[7px] flex-none rounded-full"
                    style={{ background: tone.solid }}
                    aria-hidden="true"
                  />
                  <span className="truncate font-mono text-[11.5px] text-ink-2">
                    {isBlocked
                      ? "refused — no eligible environment"
                      : formatEnvironmentLabel(decision.selectedEnvironment!)}
                  </span>
                </span>
              </>
            );

            return (
              <div key={decision.id}>
                {expandable ? (
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : decision.id)}
                    aria-expanded={isOpen}
                    className="grid w-full grid-cols-[96px_minmax(0,1.6fr)_108px_minmax(0,1.5fr)] gap-3 border-b border-paper-3 px-[18px] py-3 text-left transition-colors hover:bg-paper-2"
                    style={{
                      background: isBlocked
                        ? "var(--accent-rose-tint)"
                        : undefined,
                    }}
                  >
                    {rowContent}
                  </button>
                ) : (
                  <div
                    className="grid grid-cols-[96px_minmax(0,1.6fr)_108px_minmax(0,1.5fr)] gap-3 border-b border-paper-3 px-[18px] py-3"
                    style={{
                      background: isBlocked
                        ? "var(--accent-rose-tint)"
                        : undefined,
                    }}
                    title={formatTimestamp(decision.evaluatedAt)}
                  >
                    {rowContent}
                  </div>
                )}

                {isOpen ? (
                  <div className="border-b border-paper-3 bg-paper-0 p-4">
                    <DecisionDetailCard result={result} />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
