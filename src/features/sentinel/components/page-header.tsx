import type { ReactNode } from "react";

import { POLICY_VERSION } from "@/features/sentinel/routing/policy-config";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-paper-3 pb-[18px]">
      <div className="min-w-0">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
          {eyebrow}
        </div>
        <h1 className="m-0 font-display text-[34px] font-medium leading-[1.15] tracking-[-0.015em] text-ink-1">
          {title}
        </h1>
        <p className="mt-2 max-w-[64ch] font-reading text-lg leading-[1.5] text-ink-2">
          {subtitle}
        </p>
      </div>
      <div className="flex flex-none items-center gap-2.5">
        <span className="rounded-[var(--radius-pill)] border border-paper-3 bg-paper-2 px-2.5 py-[5px] font-mono text-[11px] text-ink-3">
          policy {POLICY_VERSION} · shadow mode off
        </span>
        {action}
      </div>
    </header>
  );
}
