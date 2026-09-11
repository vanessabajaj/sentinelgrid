"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSentinelStore } from "@/features/sentinel/store/sentinel-store";
import type { FaultId } from "@/features/sentinel/store/sentinel-store";

const FAULTS: { id: FaultId; label: string }[] = [
  { id: "ON_PREM", label: "On-prem site offline" },
  { id: "AIR_GAPPED", label: "Air-gap window closed" },
];

export function SiteNav() {
  const pathname = usePathname();
  const { results, faults, toggleFault } = useSentinelStore();

  const countFor = (environmentId: string) =>
    results.filter(
      (result) => result.decision.selectedEnvironment === environmentId,
    ).length;
  const blockedCount = results.filter(
    (result) => result.decision.status === "BLOCKED",
  ).length;

  const links = [
    { href: "/", label: "Overview", badge: "" },
    { href: "/policy", label: "Policy", badge: "5" },
    {
      href: "/stream",
      label: "Request stream",
      badge: results.length > 0 ? "live" : "",
    },
    { href: "/routes/cloud", label: "Cloud", badge: String(countFor("CLOUD")) },
    {
      href: "/routes/on-prem",
      label: "On-prem",
      badge: faults.ON_PREM ? "!" : String(countFor("ON_PREM")),
    },
    {
      href: "/routes/air-gapped",
      label: "Air-gapped",
      badge: faults.AIR_GAPPED ? "!" : String(countFor("AIR_GAPPED")),
    },
    {
      href: "/routes/blocked",
      label: "Refused",
      badge: blockedCount > 0 ? String(blockedCount) : "",
    },
    { href: "/deployment", label: "Deployment", badge: "v2.4.0" },
  ] as const;

  return (
    <nav
      aria-label="Primary"
      className="flex shrink-0 flex-col gap-6 border-b border-paper-3 bg-paper-1 px-3.5 py-5 lg:sticky lg:top-0 lg:h-screen lg:w-[232px] lg:border-r lg:border-b-0"
    >
      <Link href="/" className="flex items-center gap-2.5 px-1.5 no-underline">
        <svg viewBox="0 0 120 120" className="size-[26px] shrink-0" aria-hidden="true">
          <path
            d="M12 6 H98 Q108 6 108 16 V48 Q108 44 114 44 Q120 44 120 54 Q120 64 114 64 Q108 64 108 60 V94 Q108 104 98 104 H64 Q64 110 54 110 Q44 110 44 104 H22 Q12 104 12 94 V16 Q12 6 22 6 Z"
            fill="var(--accent-honey)"
            stroke="#B88C1F"
            strokeWidth="2"
          />
        </svg>
        <div>
          <div className="font-display text-[15px] font-semibold leading-tight text-ink-1">
            Orchestrator
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            Hybrid placement
          </div>
        </div>
      </Link>

      <div className="flex flex-col gap-0.5">
        <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
          Surfaces
        </div>
        {links.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center justify-between gap-2 rounded-[var(--radius-md)] border px-2.5 py-2.5 text-sm font-medium no-underline transition-colors ${
                isActive
                  ? "border-[rgba(212,165,58,0.35)] bg-[var(--accent-honey-tint)] text-[var(--accent-honey-ink)]"
                  : "border-transparent text-ink-2 hover:bg-paper-2"
              }`}
            >
              <span>{link.label}</span>
              <span className="font-mono text-[10px] text-ink-4">
                {link.badge}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5 border-t border-paper-3 pt-4 lg:mt-auto">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
          Fault injection
        </div>
        {FAULTS.map((fault) => {
          const active = faults[fault.id];

          return (
            <button
              key={fault.id}
              type="button"
              onClick={() => toggleFault(fault.id)}
              aria-pressed={active}
              className={`rounded-[var(--radius-sm)] border px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                active
                  ? "border-[rgba(184,74,94,0.35)] bg-[var(--accent-rose-tint)] text-[var(--accent-rose-ink)]"
                  : "border-paper-3 bg-paper-0 text-ink-2 hover:bg-paper-2"
              }`}
            >
              {fault.label}
            </button>
          );
        })}
        <p className="font-mono text-[10px] leading-relaxed text-ink-4">
          Toggles take the environment offline and re-evaluate policy across
          every surface.
        </p>
      </div>
    </nav>
  );
}
