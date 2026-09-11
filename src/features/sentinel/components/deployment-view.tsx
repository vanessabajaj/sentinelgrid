import {
  formatEnvironmentLabel,
  formatTimestamp,
} from "@/features/sentinel/components/display-utils";
import { PageHeader } from "@/features/sentinel/components/page-header";
import { environmentTone } from "@/features/sentinel/components/tones";
import { mockDeploymentArtifact } from "@/data/mock-deployment-data";
import type { TransferMethod } from "@/features/sentinel/types";

const TRANSFER_METHOD_LABELS: Record<TransferMethod, string> = {
  CI_CD_PUBLISH: "CI/CD publish",
  CONTROLLED_NETWORK_SYNC: "Controlled network sync",
  DATA_DIODE_EXPORT: "One-way data-diode export",
  MANUAL_VERIFIED_IMPORT: "Manual verified import",
};

const ARRIVAL_NOTES: Record<string, string> = {
  CLOUD: "Pulled straight from the registry over TLS once the release was signed.",
  ON_PREM:
    "Pulled over the controlled link; signature and checksum verified before activation.",
  AIR_GAPPED:
    "Carried in on write-once media through the diode, then re-verified by an operator inside the enclave.",
};

export function DeploymentView() {
  const artifact = mockDeploymentArtifact;
  const referenceChecksum = artifact.environments[0]?.checksum;
  const allMatch = artifact.environments.every(
    (env) => env.checksum === referenceChecksum,
  );

  return (
    <>
      <PageHeader
        eyebrow="Deployment"
        title="One artefact, three environments"
        subtitle="The same signed model artefact, versioned per environment — including how it crossed the diode into the enclave that has no network path at all."
      />

      <section className="rounded-[var(--radius-lg)] border border-paper-3 bg-paper-1 px-6 py-[22px] shadow-[var(--shadow-2)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
              Artefact under management
            </div>
            <div className="font-display text-[26px] font-semibold leading-tight text-ink-1">
              {artifact.displayName}
            </div>
            <div className="mt-1.5 font-mono text-[11.5px] leading-[1.7] text-ink-3">
              registry digest {referenceChecksum} · signed build
              <br />
              {artifact.description}
            </div>
          </div>
          <div
            className="min-w-[240px] flex-1 rounded-[var(--radius-md)] border px-4 py-3.5"
            style={{
              background: allMatch
                ? "var(--accent-moss-tint)"
                : "var(--accent-clay-tint)",
              borderColor: allMatch
                ? "rgba(92,122,79,0.25)"
                : "rgba(194,90,46,0.25)",
            }}
          >
            <div
              className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.1em]"
              style={{
                color: allMatch
                  ? "var(--accent-moss-ink)"
                  : "var(--accent-clay-ink)",
              }}
            >
              Version drift
            </div>
            <div
              className="font-reading text-base leading-[1.5]"
              style={{
                color: allMatch
                  ? "var(--accent-moss-ink)"
                  : "var(--accent-clay-ink)",
              }}
            >
              {allMatch
                ? "No drift. All three environments run the same version and the checksums match byte for byte."
                : "Environments are running different builds — reconcile before routing sensitive work."}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(272px,1fr))]">
        {artifact.environments.map((env) => {
          const tone = environmentTone(env.environmentId);
          const isCurrent = env.checksum === referenceChecksum;

          return (
            <article
              key={env.environmentId}
              className="rounded-[var(--radius-lg)] border bg-paper-1 px-[22px] py-5 shadow-[var(--shadow-2)]"
              style={{ borderColor: tone.bc }}
            >
              <div className="mb-3.5 flex items-center justify-between gap-2.5">
                <span
                  className="rounded-[var(--radius-pill)] border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em]"
                  style={{
                    background: tone.bg,
                    color: tone.fg,
                    borderColor: tone.bc,
                  }}
                >
                  {formatEnvironmentLabel(env.environmentId)}
                </span>
                <span
                  className="font-mono text-[11px]"
                  style={{ color: "var(--accent-moss)" }}
                >
                  ● live
                </span>
              </div>

              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-[30px] font-semibold leading-none text-ink-1">
                  v{env.version}
                </span>
                <span
                  className="rounded-[var(--radius-pill)] border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]"
                  style={{
                    background: isCurrent
                      ? "var(--accent-moss-tint)"
                      : "var(--accent-clay-tint)",
                    color: isCurrent
                      ? "var(--accent-moss-ink)"
                      : "var(--accent-clay-ink)",
                    borderColor: isCurrent
                      ? "rgba(92,122,79,0.35)"
                      : "rgba(194,90,46,0.35)",
                  }}
                >
                  {isCurrent ? "current" : "behind"}
                </span>
              </div>

              <div className="mt-2.5 font-mono text-[11px] leading-[1.7] text-ink-3">
                {env.checksum} · {env.verified ? "verified" : "unverified"}
                <br />
                applied {formatTimestamp(env.deployedAt)}
              </div>

              <p className="mt-3 mb-0 border-t border-paper-3 pt-3 text-[13px] leading-[1.5] text-ink-2">
                {ARRIVAL_NOTES[env.environmentId]}
              </p>
            </article>
          );
        })}
      </section>

      <section className="rounded-[var(--radius-lg)] border border-paper-3 bg-paper-1 px-6 py-[22px] shadow-[var(--shadow-2)]">
        <div className="mb-[18px] flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
            How v{artifact.environments[0]?.version} reaches the enclave
          </h2>
          <span className="font-mono text-[11px] text-ink-3">
            manual import · no network path exists
          </span>
        </div>

        <ol className="m-0 flex list-none flex-col p-0">
          {artifact.transferLog.map((step, index) => {
            const isDiode =
              step.method === "DATA_DIODE_EXPORT" ||
              step.method === "MANUAL_VERIFIED_IMPORT";

            return (
              <li
                key={step.id}
                className="grid grid-cols-[34px_minmax(0,1fr)] gap-4"
              >
                <div className="flex flex-col items-center">
                  <span
                    className="flex size-[26px] flex-none items-center justify-center rounded-full border font-mono text-[11px]"
                    style={{
                      background: isDiode
                        ? "var(--accent-plum-tint)"
                        : "var(--accent-moss-tint)",
                      color: isDiode
                        ? "var(--accent-plum-ink)"
                        : "var(--accent-moss-ink)",
                      borderColor: isDiode
                        ? "rgba(107,62,94,0.4)"
                        : "rgba(92,122,79,0.4)",
                    }}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="min-h-[12px] w-px flex-1 bg-paper-3" />
                </div>
                <div className="min-w-0 pb-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[15px] font-semibold text-ink-1">
                      {step.fromEnvironmentId
                        ? `${formatEnvironmentLabel(step.fromEnvironmentId)} → ${formatEnvironmentLabel(step.toEnvironmentId)}`
                        : `Build → ${formatEnvironmentLabel(step.toEnvironmentId)}`}
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {TRANSFER_METHOD_LABELS[step.method]}
                    </span>
                  </div>
                  <div className="mt-1.5 font-mono text-[11.5px] leading-[1.65] text-ink-3">
                    {step.description}
                  </div>
                  <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">
                    {formatTimestamp(step.occurredAt)}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
