"use client";

import Link from "next/link";

import { DecisionDetailCard } from "@/features/sentinel/components/decision-detail-card";
import { EnvironmentCard } from "@/features/sentinel/components/environment-card";
import { PageHeader } from "@/features/sentinel/components/page-header";
import { useSentinelStore } from "@/features/sentinel/store/sentinel-store";
import type { EnvironmentId } from "@/features/sentinel/types";

interface EnvironmentRouteViewProps {
  environmentId: EnvironmentId;
  eyebrow: string;
  title: string;
  subtitle: string;
  typicalWorkloads: string;
}

export function EnvironmentRouteView({
  environmentId,
  eyebrow,
  title,
  subtitle,
  typicalWorkloads,
}: EnvironmentRouteViewProps) {
  const { environments, results } = useSentinelStore();
  const environment = environments.find((env) => env.id === environmentId);
  const routedResults = results.filter(
    (result) => result.decision.selectedEnvironment === environmentId,
  );
  const routedTotal = results.filter(
    (result) => result.decision.selectedEnvironment !== null,
  ).length;

  if (!environment) {
    return null;
  }

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <EnvironmentCard
          environment={environment}
          selectedEnvironment={null}
          sharePercent={
            routedTotal === 0
              ? 0
              : Math.round((routedResults.length / routedTotal) * 100)
          }
        />

        <div className="rounded-[var(--radius-lg)] border border-paper-3 bg-paper-2 px-[22px] py-5 shadow-[var(--shadow-inset)]">
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
            What runs here
          </h2>
          <p className="m-0 max-w-[70ch] font-reading text-[17px] leading-[1.55] text-ink-2">
            {typicalWorkloads}
          </p>
          {!environment.online ? (
            <p
              className="mt-3.5 mb-0 rounded-[var(--radius-md)] border px-3.5 py-3 font-mono text-[11.5px] leading-[1.6]"
              style={{
                background: "var(--accent-rose-tint)",
                borderColor: "rgba(184,74,94,0.25)",
                color: "var(--accent-rose-ink)",
              }}
            >
              This environment is currently offline via fault injection. Policy
              will refuse anything that can only run here rather than placing it
              somewhere it should not run.
            </p>
          ) : null}
        </div>
      </div>

      <section className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
            Jobs placed here this session
          </h2>
          <span className="font-mono text-[11px] text-ink-3">
            {routedResults.length} decisions
          </span>
        </div>

        {routedResults.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-paper-3 bg-paper-1 px-6 py-10 text-center shadow-[var(--shadow-1)]">
            <p className="m-0 font-reading text-[17px] text-ink-2">
              Nothing has been placed here yet.
            </p>
            <p className="mt-1.5 mb-0 text-[13px] text-ink-3">
              Submit a job from the{" "}
              <Link href="/" className="font-medium text-ocean">
                overview
              </Link>{" "}
              to see it evaluated against this environment.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {routedResults.map((result) => (
              <DecisionDetailCard
                key={result.decision.id}
                result={result}
                focusEnvironmentId={environmentId}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
