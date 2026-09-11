"use client";

import { AuditLog } from "@/features/sentinel/components/audit-log";
import { PageHeader } from "@/features/sentinel/components/page-header";
import { useSentinelStore } from "@/features/sentinel/store/sentinel-store";

export function StreamView() {
  const { results, resetSession } = useSentinelStore();

  return (
    <>
      <PageHeader
        eyebrow="Live"
        title="Request stream"
        subtitle="Each row is one routing decision, newest first. Open any row for its full check ladder and the candidates it ruled out."
      />

      <AuditLog results={results} onResetSession={resetSession} expandable />
    </>
  );
}
