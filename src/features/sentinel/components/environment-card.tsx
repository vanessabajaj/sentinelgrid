import { formatEnumLabel } from "@/features/sentinel/components/display-utils";
import { environmentTone } from "@/features/sentinel/components/tones";
import type {
  Environment,
  EnvironmentEvaluation,
  EnvironmentId,
} from "@/features/sentinel/types";

interface EnvironmentCardProps {
  environment: Environment;
  evaluation?: EnvironmentEvaluation;
  selectedEnvironment: EnvironmentId | null;
  /** Share of this session's routed traffic, 0–100. */
  sharePercent?: number;
}

const SITE_NAMES: Record<EnvironmentId, string> = {
  CLOUD: "Elastic public cloud",
  ON_PREM: "Fixed on-prem pool",
  AIR_GAPPED: "Isolated enclave",
};

const SITE_SUBTITLES: Record<EnvironmentId, string> = {
  CLOUD: "elastic, externally networked, cheapest",
  ON_PREM: "fixed capacity · brokered egress",
  AIR_GAPPED: "no network path · one-way data diode",
};

export function EnvironmentCard({
  environment,
  evaluation,
  selectedEnvironment,
  sharePercent = 0,
}: EnvironmentCardProps) {
  const tone = environmentTone(environment.id);
  const isSelected = selectedEnvironment === environment.id;
  const isRejected = evaluation !== undefined && !evaluation.eligible;
  const capacityPercent = Math.min(
    100,
    Math.max(0, (environment.usedCapacity / environment.capacity) * 100),
  );
  const firstFailure = evaluation?.checks.find((check) => !check.passed);

  const status = !environment.online
    ? "offline"
    : isSelected
      ? "placed here"
      : evaluation?.eligible
        ? "eligible"
        : isRejected
          ? "ruled out"
          : "healthy";

  const statusColor = !environment.online
    ? "var(--accent-rose)"
    : isRejected
      ? "var(--accent-clay)"
      : "var(--accent-moss)";

  return (
    <article
      className="relative overflow-hidden border bg-paper-1 py-5 pr-[22px] pl-10 shadow-[var(--shadow-2)]"
      style={{
        borderColor: isSelected ? "var(--ink-1)" : "var(--paper-3)",
        borderRadius: "var(--radius-xl) var(--radius-lg) var(--radius-lg) var(--radius-xl)",
      }}
    >
      {/* The notch that makes each environment read as one interlocking piece. */}
      <div
        aria-hidden="true"
        className="absolute left-0 size-[30px] rounded-full border border-paper-3 bg-paper-0"
        style={{ top: "calc(50% - 15px)" }}
      />
      <div
        aria-hidden="true"
        className="absolute -left-px h-[34px] w-[15px] bg-paper-0"
        style={{ top: "calc(50% - 17px)" }}
      />

      <div className="mb-3.5 flex items-center justify-between gap-3">
        <span
          className="rounded-[var(--radius-pill)] border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em]"
          style={{
            background: tone.bg,
            color: tone.fg,
            borderColor: tone.bc,
          }}
        >
          {formatEnumLabel(environment.id)}
        </span>
        <span className="font-mono text-[11px]" style={{ color: statusColor }}>
          ● {status}
        </span>
      </div>

      <div className="mb-1 font-display text-[22px] font-semibold leading-tight text-ink-1">
        {SITE_NAMES[environment.id]}
      </div>
      <div className="mb-[18px] font-mono text-[11px] text-ink-3">
        {SITE_SUBTITLES[environment.id]}
      </div>

      <dl className="flex flex-col gap-[9px]">
        <div className="flex justify-between gap-2.5 text-[13px] text-ink-2">
          <dt>Share of traffic</dt>
          <dd className="font-mono font-semibold">{sharePercent}%</dd>
        </div>
        <div
          className="h-[7px] overflow-hidden rounded-[var(--radius-pill)] bg-paper-2 shadow-[var(--shadow-inset)]"
          role="progressbar"
          aria-label={`${environment.displayName} share of routed traffic`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={sharePercent}
        >
          <div
            className="h-full"
            style={{ width: `${sharePercent}%`, background: tone.solid }}
          />
        </div>
        <div className="flex justify-between gap-2.5 text-[13px] text-ink-2">
          <dt>Capacity</dt>
          <dd className="font-mono">
            {environment.capacity - environment.usedCapacity} of{" "}
            {environment.capacity} free
            {capacityPercent >= 85 ? " · tight" : ""}
          </dd>
        </div>
        <div className="flex justify-between gap-2.5 text-[13px] text-ink-2">
          <dt>Outbound network</dt>
          <dd className="font-mono">
            {environment.networkMode === "NONE"
              ? "none"
              : environment.networkMode === "CONTROLLED"
                ? "brokered egress"
                : "public egress"}
          </dd>
        </div>
        <div className="flex justify-between gap-2.5 text-[13px] text-ink-2">
          <dt>Workload types</dt>
          <dd className="font-mono">
            {environment.supportedIncidentTypes.length} supported
          </dd>
        </div>
        <div className="flex justify-between gap-2.5 text-[13px] text-ink-2">
          <dt>Classes permitted</dt>
          <dd className="font-mono">
            up to {formatEnumLabel(environment.maxClassification).toLowerCase()}
          </dd>
        </div>
      </dl>

      {firstFailure ? (
        <div
          className="mt-3.5 rounded-[var(--radius-md)] border px-3 py-2.5"
          style={{
            background: "var(--accent-rose-tint)",
            borderColor: "rgba(184,74,94,0.25)",
          }}
        >
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--accent-rose-ink)]">
            {firstFailure.name}
          </p>
          <p className="mt-1 font-mono text-[11px] leading-[1.6] text-[var(--accent-rose-ink)]">
            {firstFailure.reason}
          </p>
        </div>
      ) : null}
    </article>
  );
}
