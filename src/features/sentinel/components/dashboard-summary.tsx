import Link from "next/link";

import { formatEnvironmentLabel } from "@/features/sentinel/components/display-utils";
import { environmentTone } from "@/features/sentinel/components/tones";
import type { AuditEntry, EnvironmentId } from "@/features/sentinel/types";

interface DashboardSummaryProps {
  entries: AuditEntry[];
}

const ENVIRONMENTS: EnvironmentId[] = ["CLOUD", "ON_PREM", "AIR_GAPPED"];

const HREFS: Record<EnvironmentId, string> = {
  CLOUD: "/routes/cloud",
  ON_PREM: "/routes/on-prem",
  AIR_GAPPED: "/routes/air-gapped",
};

export function DashboardSummary({ entries }: DashboardSummaryProps) {
  const blocked = entries.filter((entry) => entry.outcome === "BLOCKED").length;
  const routed = entries.length - blocked;

  return (
    <section
      aria-labelledby="summary-heading"
      className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]"
    >
      <div className="rounded-[var(--radius-lg)] border border-paper-3 bg-paper-1 px-[22px] py-5 shadow-[var(--shadow-2)]">
        <h2
          id="summary-heading"
          className="mb-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3"
        >
          This session
        </h2>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(108px,1fr))]">
          <div>
            <div className="font-display text-[30px] font-semibold leading-none text-ink-1">
              {routed}
            </div>
            <div className="mt-1.5 text-[12.5px] text-ink-3">jobs routed</div>
          </div>
          <div>
            <div
              className="font-display text-[30px] font-semibold leading-none"
              style={{
                color: blocked > 0 ? "var(--accent-rose)" : "var(--ink-1)",
              }}
            >
              {blocked}
            </div>
            <div className="mt-1.5 text-[12.5px] text-ink-3">
              refused by policy
            </div>
          </div>
          <div>
            <div className="font-display text-[30px] font-semibold leading-none text-ink-1">
              {entries.length}
            </div>
            <div className="mt-1.5 text-[12.5px] text-ink-3">
              decisions logged
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-paper-3 bg-paper-1 px-[22px] py-5 shadow-[var(--shadow-2)]">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
            Where work landed
          </h2>
          <Link
            href="/stream"
            className="rounded-[10px] border border-paper-4 bg-paper-1 px-3 py-1.5 text-[13px] font-semibold text-ink-1 no-underline transition-colors hover:bg-paper-2"
          >
            Request stream
          </Link>
        </div>
        <div className="flex flex-col gap-2.5">
          {ENVIRONMENTS.map((environmentId) => {
            const count = entries.filter(
              (entry) => entry.selectedEnvironment === environmentId,
            ).length;
            const tone = environmentTone(environmentId);

            return (
              <Link
                key={environmentId}
                href={HREFS[environmentId]}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-paper-3 bg-paper-0 px-3.5 py-2.5 no-underline transition-colors hover:bg-paper-2"
              >
                <span
                  className="size-2 flex-none rounded-full"
                  style={{ background: tone.solid }}
                  aria-hidden="true"
                />
                <span className="flex-1 text-sm font-medium text-ink-1">
                  {formatEnvironmentLabel(environmentId)}
                </span>
                <span className="font-mono text-[13px] text-ink-2">
                  {count}
                </span>
              </Link>
            );
          })}
          <Link
            href="/routes/blocked"
            className="flex items-center gap-3 rounded-[var(--radius-md)] border px-3.5 py-2.5 no-underline transition-colors"
            style={{
              background:
                blocked > 0 ? "var(--accent-rose-tint)" : "var(--paper-0)",
              borderColor:
                blocked > 0 ? "rgba(184,74,94,0.25)" : "var(--paper-3)",
            }}
          >
            <span
              className="size-2 flex-none rounded-full"
              style={{ background: "var(--accent-rose)" }}
              aria-hidden="true"
            />
            <span className="flex-1 text-sm font-medium text-ink-1">
              Refused
            </span>
            <span className="font-mono text-[13px] text-ink-2">{blocked}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
