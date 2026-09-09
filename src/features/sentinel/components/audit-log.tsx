import {
  formatEnvironmentLabel,
  formatEnumLabel,
  formatTimestamp,
} from "@/features/sentinel/components/display-utils";
import type { AuditEntry } from "@/features/sentinel/types";

interface AuditLogProps {
  entries: AuditEntry[];
}

export function AuditLog({ entries }: AuditLogProps) {
  return (
    <section
      className="overflow-hidden rounded-md border border-border bg-panel"
      aria-labelledby="audit-heading"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Decision trail
          </p>
          <h2
            id="audit-heading"
            className="mt-1 text-lg font-semibold text-white"
          >
            Session audit log
          </h2>
        </div>
        <span className="rounded border border-border bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
          {entries.length} records
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            No routing decisions in this session
          </p>
          <p className="mt-1 text-xs text-muted">
            Completed evaluations will appear here, newest first.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-surface/70 text-muted">
                <th className="px-5 py-3 font-medium">Timestamp</th>
                <th className="px-5 py-3 font-medium">Decision ID</th>
                <th className="px-5 py-3 font-medium">Incident</th>
                <th className="px-5 py-3 font-medium">Classification</th>
                <th className="px-5 py-3 font-medium">Outcome</th>
                <th className="px-5 py-3 font-medium">Environment</th>
                <th className="px-5 py-3 font-medium">Policy</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={`${entry.decisionId}-${entry.timestamp}`}
                  className="border-b border-border/70 last:border-b-0 hover:bg-panel-raised/50"
                >
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-[11px] text-muted">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td className="max-w-52 truncate px-5 py-4 font-mono text-[11px] text-foreground">
                    {entry.decisionId}
                  </td>
                  <td className="max-w-64 truncate px-5 py-4 font-medium text-white">
                    {entry.incidentTitle}
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px] text-foreground">
                    {formatEnumLabel(entry.classification)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`font-mono text-[11px] font-bold ${
                        entry.outcome === "BLOCKED"
                          ? "text-danger"
                          : "text-success"
                      }`}
                    >
                      {entry.outcome}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium text-foreground">
                    {entry.selectedEnvironment
                      ? formatEnvironmentLabel(entry.selectedEnvironment)
                      : "BLOCKED"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-[11px] text-muted">
                    {entry.policyVersion}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
