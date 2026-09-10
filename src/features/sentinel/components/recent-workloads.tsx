import {
  formatEnvironmentLabel,
  formatEnumLabel,
  formatTimestamp,
} from "@/features/sentinel/components/display-utils";
import type { WorkloadResult } from "@/features/sentinel/types";

interface RecentWorkloadsProps {
  workloads: WorkloadResult[];
  selectedIncidentId: string | null;
  onSelect: (workload: WorkloadResult) => void;
}

const OUTCOME_STYLES: Record<WorkloadResult["outcome"], string> = {
  ROUTED: "text-success",
  BLOCKED: "text-danger",
  QUARANTINED: "text-warning",
};

export function RecentWorkloads({
  workloads,
  selectedIncidentId,
  onSelect,
}: RecentWorkloadsProps) {
  return (
    <section
      className="overflow-hidden rounded-md border border-border bg-panel"
      aria-labelledby="workloads-heading"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Job history
          </p>
          <h2
            id="workloads-heading"
            className="mt-1 text-lg font-semibold text-white"
          >
            Recent workloads
          </h2>
          <p className="mt-1 text-xs text-muted">
            Select a job to reopen its full policy decision and analysis
            above.
          </p>
        </div>
        <span className="rounded border border-border bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
          {workloads.length} jobs
        </span>
      </div>

      {workloads.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            No workloads submitted yet
          </p>
          <p className="mt-1 text-xs text-muted">
            Submitted incidents will appear here, newest first.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-surface/70 text-muted">
                <th className="px-5 py-3 font-medium">Job</th>
                <th className="px-5 py-3 font-medium">Classification</th>
                <th className="px-5 py-3 font-medium">Environment</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {workloads.map((workload) => {
                const isSelected =
                  workload.incident.id === selectedIncidentId;

                return (
                  <tr
                    key={workload.incident.id}
                    onClick={() => onSelect(workload)}
                    aria-current={isSelected ? "true" : undefined}
                    className={`cursor-pointer border-b border-border/70 last:border-b-0 hover:bg-panel-raised/50 ${
                      isSelected ? "bg-panel-raised/70" : ""
                    }`}
                  >
                    <td className="max-w-64 truncate px-5 py-4 font-medium text-white">
                      {workload.incident.title}
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-foreground">
                      {formatEnumLabel(workload.incident.classification)}
                    </td>
                    <td className="px-5 py-4 text-foreground">
                      <span className="font-medium">
                        {workload.workerExecution
                          ? formatEnvironmentLabel(
                              workload.workerExecution.environmentId,
                            )
                          : workload.decision?.selectedEnvironment
                            ? formatEnvironmentLabel(
                                workload.decision.selectedEnvironment,
                              )
                          : workload.outcome}
                      </span>
                      {workload.workerExecution ? (
                        <span className="mt-1 block text-[10px] text-muted">
                          {workload.workerExecution.workerName} ·{" "}
                          {formatEnumLabel(
                            workload.workerExecution.executionMode,
                          )}
                        </span>
                      ) : workload.executionFailure ? (
                        <span className="mt-1 block text-[10px] text-danger">
                          {workload.executionFailure.workerName}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`font-mono text-[11px] font-bold ${
                          workload.executionStatus === "FAILED"
                            ? "text-danger"
                            : OUTCOME_STYLES[workload.outcome]
                        }`}
                      >
                        {workload.executionStatus === "FAILED"
                          ? "FAILED"
                          : workload.outcome}
                      </span>
                      {workload.executionStatus &&
                      workload.executionStatus !== "FAILED" ? (
                        <span className="ml-2 font-mono text-[10px] text-muted">
                          · {workload.executionStatus}
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-[11px] text-muted">
                      {formatTimestamp(workload.incident.submittedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
