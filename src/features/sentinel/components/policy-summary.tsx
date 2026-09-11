"use client";

import { useState } from "react";

import { formatEnumLabel } from "@/features/sentinel/components/display-utils";
import { PageHeader } from "@/features/sentinel/components/page-header";
import {
  CLASSIFICATION_TONE,
  TONES,
} from "@/features/sentinel/components/tones";
import type { ToneName } from "@/features/sentinel/components/tones";
import {
  CLASSIFICATION_RANK,
  ENVIRONMENT_PREFERENCE,
  NETWORK_CAPABILITY_RANK,
} from "@/features/sentinel/routing/policy-config";
import type { Classification } from "@/features/sentinel/types";

const CLASSIFICATIONS = Object.keys(CLASSIFICATION_RANK) as Classification[];

interface Rule {
  effect: "Deny" | "Route" | "Gate";
  name: string;
  when: string;
  then: string;
  evidence: string;
  owner: string;
  tone: ToneName;
}

/** The rules the router actually enforces, in the order it enforces them. */
const RULES: Rule[] = [
  {
    effect: "Gate",
    name: "An offline environment is never a candidate",
    when: "environment.online == false",
    then: "Drop the environment from the candidate set before anything else is considered.",
    evidence:
      "A degraded site must not receive work. Use the sidebar fault-injection toggles to take one offline and watch every downstream decision change.",
    owner: "platform",
    tone: "paper",
  },
  {
    effect: "Deny",
    name: "Clearance ceiling is absolute",
    when: "rank(job.classification) > rank(environment.maxClassification)",
    then: "Deny. Secret and Classified work is therefore air-gapped only; Confidential never reaches public cloud.",
    evidence:
      "The clearance ranking is the spine of the policy: Public 0, Internal 1, Confidential 2, Secret 3, Classified 4. An environment may only take work at or below its own ceiling.",
    owner: "security",
    tone: "rose",
  },
  {
    effect: "Deny",
    name: "Network capability must satisfy the requirement",
    when: "rank(environment.networkMode) < rank(job.requiredNetworkMode)",
    then: "Deny. The air-gapped enclave (NONE) can never satisfy an EXTERNAL requirement.",
    evidence:
      "Capability ranking is NONE 0, CONTROLLED 1, EXTERNAL 2. This rule combined with the clearance ceiling is what produces the refusal case: Secret work needing external network has no environment that satisfies both.",
    owner: "security",
    tone: "plum",
  },
  {
    effect: "Deny",
    name: "Capacity must cover the job",
    when: "environment.capacity - environment.usedCapacity < job.estimatedWorkload",
    then: "Deny. The fixed on-prem pool and the enclave are small, so large jobs fall through to elastic cloud when their classification permits it.",
    evidence:
      "On-prem and the enclave are fixed pools; admitting work they cannot hold would starve inference already running there.",
    owner: "platform",
    tone: "moss",
  },
  {
    effect: "Route",
    name: "Among eligible environments, preference order decides",
    when: "all gates passed",
    then: "Pick the highest-preference eligible environment for that classification. Ties break deterministically, so the same job and policy always produce the same answer.",
    evidence:
      "Public work prefers cloud (cheapest, elastic). Internal and Confidential prefer on-prem. Secret and Classified have exactly one option — the enclave.",
    owner: "platform",
    tone: "ocean",
  },
];

export function PolicySummary() {
  const [selectedIndex, setSelectedIndex] = useState(1);
  const selected = RULES[selectedIndex];
  const selectedTone = TONES[selected.tone];

  return (
    <>
      <PageHeader
        eyebrow="Policy"
        title="Classification and placement rules"
        subtitle="Every job carries exactly one classification. Gates are evaluated against all three environments, and only an environment that clears every gate can be chosen."
      />

      <section className="rounded-[var(--radius-lg)] border border-paper-3 bg-paper-2 px-5 py-[18px] shadow-[var(--shadow-inset)]">
        <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
            Classification scheme
          </h2>
          <span className="font-mono text-[11px] text-ink-3">
            a job carries exactly one level
          </span>
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
          {CLASSIFICATIONS.map((classification) => {
            const tone = TONES[CLASSIFICATION_TONE[classification]];
            const allowed = ENVIRONMENT_PREFERENCE[classification]
              .map((id) => formatEnumLabel(id).toLowerCase())
              .join(" or ");

            return (
              <div
                key={classification}
                className="rounded-[var(--radius-md)] border px-4 py-3.5"
                style={{
                  background: tone.bg,
                  borderColor: tone.bc,
                  color: tone.fg,
                }}
              >
                <div className="text-sm font-semibold">
                  {formatEnumLabel(classification)}
                </div>
                <div className="mt-1.5 font-mono text-[11px] leading-[1.55] opacity-80">
                  {allowed}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid items-start gap-[22px] lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <p className="m-0 font-mono text-[11px] text-ink-3">
            Every gate is evaluated · all must pass for an environment to be
            eligible
          </p>

          {RULES.map((rule, index) => {
            const tone = TONES[rule.tone];
            const isSelected = index === selectedIndex;

            return (
              <button
                key={rule.name}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-pressed={isSelected}
                className="flex w-full items-start gap-3.5 rounded-[var(--radius-md)] border px-[17px] py-[15px] text-left shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)]"
                style={{
                  background: isSelected
                    ? "var(--paper-1)"
                    : "var(--paper-0)",
                  borderColor: isSelected ? "var(--ink-1)" : "var(--paper-3)",
                }}
              >
                <span className="flex-none pt-0.5 font-mono text-[11px] text-ink-3">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-[var(--radius-pill)] border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]"
                      style={{
                        background: tone.bg,
                        color: tone.fg,
                        borderColor: tone.bc,
                      }}
                    >
                      {rule.effect}
                    </span>
                    <span className="text-[15px] font-semibold text-ink-1">
                      {rule.name}
                    </span>
                  </span>
                  <span className="mt-2 block font-mono text-[11.5px] leading-[1.6] text-ink-2">
                    {rule.when}
                  </span>
                  <span className="mt-1.5 block text-[12.5px] text-ink-3">
                    {rule.then}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <aside className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-paper-3 bg-paper-1 px-[22px] py-5 shadow-[var(--shadow-2)] lg:sticky lg:top-6">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
              Selected rule
            </div>
            <div className="font-display text-[22px] font-semibold leading-tight text-ink-1">
              {selected.name}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              Condition
            </div>
            <div
              className="rounded-[var(--radius-sm)] border px-3.5 py-3 font-mono text-xs leading-[1.7] text-ink-2 shadow-[var(--shadow-inset)]"
              style={{
                background: selectedTone.bg,
                borderColor: selectedTone.bc,
              }}
            >
              {selected.when}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              Placement
            </div>
            <p className="m-0 text-sm leading-[1.55] text-ink-2">
              {selected.then}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              Evidence
            </div>
            <p className="m-0 font-reading text-base leading-[1.55] text-ink-2">
              {selected.evidence}
            </p>
            <p className="m-0 font-mono text-[11px] text-ink-3">
              Owner {selected.owner} · enforced in evaluate-routing.ts
            </p>
          </div>
        </aside>
      </div>

      <section className="rounded-[var(--radius-lg)] border border-paper-3 bg-paper-1 px-[22px] py-5 shadow-[var(--shadow-2)]">
        <h2 className="mb-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
          Network mode compatibility
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left">
            <thead>
              <tr className="border-b border-paper-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                <th className="py-2.5 pr-4 font-semibold">Network mode</th>
                <th className="py-2.5 pr-4 font-semibold">Capability rank</th>
                <th className="py-2.5 font-semibold">Satisfies</th>
              </tr>
            </thead>
            <tbody>
              {(
                Object.keys(
                  NETWORK_CAPABILITY_RANK,
                ) as (keyof typeof NETWORK_CAPABILITY_RANK)[]
              ).map((mode) => (
                <tr key={mode} className="border-b border-paper-3 last:border-0">
                  <td className="py-2.5 pr-4 font-mono text-[12.5px] font-semibold text-ink-1">
                    {mode}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[12.5px] text-ink-3">
                    {NETWORK_CAPABILITY_RANK[mode]}
                  </td>
                  <td className="py-2.5 font-mono text-[12.5px] text-ink-2">
                    {(
                      Object.keys(
                        NETWORK_CAPABILITY_RANK,
                      ) as (keyof typeof NETWORK_CAPABILITY_RANK)[]
                    )
                      .filter(
                        (required) =>
                          NETWORK_CAPABILITY_RANK[mode] >=
                          NETWORK_CAPABILITY_RANK[required],
                      )
                      .join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3.5 mb-0 max-w-[72ch] font-reading text-base leading-[1.55] text-ink-2">
          An environment satisfies a job&apos;s network requirement only when
          its own capability rank is at least the required rank. The enclave
          sits at NONE, so it never satisfies EXTERNAL — which is precisely the
          gate that produces the refusal case.
        </p>
      </section>
    </>
  );
}
