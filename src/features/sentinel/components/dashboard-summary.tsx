import type { AuditEntry } from "@/features/sentinel/types";

interface DashboardSummaryProps {
  entries: AuditEntry[];
}

const METRICS = [
  { key: "total", label: "Total Evaluations", marker: "Σ" },
  { key: "cloud", label: "Cloud Routes", marker: "CLD" },
  { key: "onPrem", label: "On-Prem Routes", marker: "ONP" },
  { key: "airGap", label: "Air-Gapped Routes", marker: "AIR" },
  { key: "blocked", label: "Blocked Requests", marker: "!" },
  { key: "quarantined", label: "Quarantined", marker: "⚑" },
] as const;

export function DashboardSummary({ entries }: DashboardSummaryProps) {
  const values = {
    total: entries.length,
    cloud: entries.filter(
      (entry) => entry.selectedEnvironment === "CLOUD",
    ).length,
    onPrem: entries.filter(
      (entry) => entry.selectedEnvironment === "ON_PREM",
    ).length,
    airGap: entries.filter(
      (entry) => entry.selectedEnvironment === "AIR_GAPPED",
    ).length,
    blocked: entries.filter((entry) => entry.outcome === "BLOCKED").length,
    quarantined: entries.filter((entry) => entry.outcome === "QUARANTINED")
      .length,
  };

  return (
    <section aria-labelledby="summary-heading">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Live session
          </p>
          <h2
            id="summary-heading"
            className="mt-1 text-lg font-semibold text-white"
          >
            Routing overview
          </h2>
        </div>
        <p className="hidden text-xs text-muted sm:block">
          In-memory runtime metrics · resets with the server
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {METRICS.map((metric) => (
          <article
            key={metric.key}
            className="rounded-md border border-border bg-panel px-4 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium text-muted">{metric.label}</p>
              <span
                className={`font-mono text-[10px] font-bold tracking-wider ${
                  metric.key === "blocked" || metric.key === "quarantined"
                    ? "text-warning"
                    : "text-accent"
                }`}
                aria-hidden="true"
              >
                {metric.marker}
              </span>
            </div>
            <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-white">
              {values[metric.key].toString().padStart(2, "0")}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
