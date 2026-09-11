"use client";

import Link from "next/link";

import { DecisionDetailCard } from "@/features/sentinel/components/decision-detail-card";
import { PageHeader } from "@/features/sentinel/components/page-header";
import { useSentinelStore } from "@/features/sentinel/store/sentinel-store";

export function BlockedRequestsView() {
  const { results } = useSentinelStore();
  const blockedResults = results.filter(
    (result) => result.decision.status === "BLOCKED",
  );

  return (
    <>
      <PageHeader
        eyebrow="Review"
        title="Refusals and near misses"
        subtitle="Jobs policy would not place anywhere, and the gate each environment failed. A refusal is recorded, never silently downgraded or rerouted."
      />

      <section
        className="rounded-[var(--radius-lg)] border px-[22px] py-5 shadow-[var(--shadow-inset)]"
        style={{
          background: "var(--paper-2)",
          borderColor: "var(--paper-3)",
        }}
      >
        <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
          Why a job gets refused
        </h2>
        <p className="m-0 max-w-[72ch] font-reading text-[17px] leading-[1.55] text-ink-2">
          Every environment is checked against five gates — online, clearance,
          network mode, capacity, and workload support. A job is refused when
          no environment passes all five. The canonical case: a{" "}
          <span className="font-mono text-[15px]">SECRET</span> job that needs{" "}
          <span className="font-mono text-[15px]">EXTERNAL</span> network
          access. Only the enclave is cleared for Secret, and the enclave has no
          outbound network — so the one permitted environment cannot run it, and
          the classification may not be relaxed to reach one that can.
        </p>
      </section>

      <section className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
            Refused this session
          </h2>
          <span className="font-mono text-[11px] text-ink-3">
            {blockedResults.length} decisions
          </span>
        </div>

        {blockedResults.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-paper-3 bg-paper-1 px-6 py-10 text-center shadow-[var(--shadow-1)]">
            <p className="m-0 font-reading text-[17px] text-ink-2">
              Nothing has been refused this session.
            </p>
            <p className="mt-1.5 mb-0 text-[13px] text-ink-3">
              Load the{" "}
              <Link href="/" className="font-medium text-ocean">
                Secret external-network scenario
              </Link>{" "}
              on the overview, or flip a fault-injection toggle in the sidebar
              and re-run a job that only fits the environment you just knocked
              offline.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {blockedResults.map((result) => (
              <DecisionDetailCard key={result.decision.id} result={result} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
