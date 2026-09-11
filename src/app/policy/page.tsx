import type { Metadata } from "next";

import { PolicySummary } from "@/features/sentinel/components/policy-summary";

export const metadata: Metadata = {
  title: "Policy | Orchestrator",
};

export default function PolicyPage() {
  return <PolicySummary />;
}
