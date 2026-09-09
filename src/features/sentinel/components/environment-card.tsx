import { formatEnumLabel } from "@/features/sentinel/components/display-utils";
import type {
  Environment,
  EnvironmentEvaluation,
  EnvironmentId,
} from "@/features/sentinel/types";

interface EnvironmentCardProps {
  environment: Environment;
  evaluation?: EnvironmentEvaluation;
  selectedEnvironment: EnvironmentId | null;
}

const ENVIRONMENT_CODES: Record<EnvironmentId, string> = {
  CLOUD: "CLD",
  ON_PREM: "ONP",
  AIR_GAPPED: "AIR",
};

export function EnvironmentCard({
  environment,
  evaluation,
  selectedEnvironment,
}: EnvironmentCardProps) {
  const isSelected = selectedEnvironment === environment.id;
  const isRejected = evaluation !== undefined && !evaluation.eligible;
  const capacityPercent = Math.min(
    100,
    Math.max(0, (environment.usedCapacity / environment.capacity) * 100),
  );
  const firstFailure = evaluation?.checks.find((check) => !check.passed);

  const status = isSelected
    ? "Selected"
    : evaluation?.eligible
      ? "Eligible"
      : isRejected
        ? "Rejected"
        : "Standby";

  const statusClass = isSelected
    ? "border-accent/40 bg-accent/10 text-accent"
    : evaluation?.eligible
      ? "border-success/35 bg-success/10 text-success"
      : isRejected
        ? "border-danger/35 bg-danger/10 text-danger"
        : "border-border bg-surface text-muted";

  return (
    <article
      className={`rounded-md border bg-panel p-5 transition-colors ${
        isSelected ? "border-accent" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`grid size-9 place-items-center rounded border font-mono text-[10px] font-bold tracking-wider ${
              isSelected
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border bg-surface text-muted"
            }`}
            aria-hidden="true"
          >
            {ENVIRONMENT_CODES[environment.id]}
          </span>
          <div>
            <h3 className="font-semibold text-white">
              {environment.displayName}
            </h3>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
              {environment.id}
            </p>
          </div>
        </div>
        <span
          className={`rounded border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${statusClass}`}
        >
          {status}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-border py-4">
        <div>
          <dt className="text-[11px] text-muted">Max classification</dt>
          <dd className="mt-1 font-mono text-xs font-semibold text-foreground">
            {formatEnumLabel(environment.maxClassification)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted">Network mode</dt>
          <dd className="mt-1 font-mono text-xs font-semibold text-foreground">
            {formatEnumLabel(environment.networkMode)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted">System status</dt>
          <dd
            className={`mt-1 flex items-center gap-2 text-xs font-medium ${
              environment.online ? "text-success" : "text-danger"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                environment.online ? "bg-success" : "bg-danger"
              }`}
              aria-hidden="true"
            />
            {environment.online ? "Online" : "Offline"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted">Supported workloads</dt>
          <dd className="mt-1 font-mono text-xs font-semibold text-foreground">
            {environment.supportedIncidentTypes.length} types
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="text-muted">Capacity allocation</span>
          <span className="font-mono tabular-nums text-foreground">
            {environment.usedCapacity} / {environment.capacity}
          </span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"
          role="progressbar"
          aria-label={`${environment.displayName} capacity used`}
          aria-valuemin={0}
          aria-valuemax={environment.capacity}
          aria-valuenow={environment.usedCapacity}
        >
          <div
            className={`h-full rounded-full ${
              capacityPercent >= 85 ? "bg-warning" : "bg-accent"
            }`}
            style={{ width: `${capacityPercent}%` }}
          />
        </div>
      </div>

      {firstFailure ? (
        <div className="mt-4 rounded border border-danger/20 bg-danger/5 p-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-danger">
            {firstFailure.name}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-foreground">
            {firstFailure.reason}
          </p>
        </div>
      ) : null}
    </article>
  );
}
