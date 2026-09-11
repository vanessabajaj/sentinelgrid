import type { Metadata } from "next";

import { EnvironmentRouteView } from "@/features/sentinel/components/environment-route-view";

export const metadata: Metadata = {
  title: "On-prem | Orchestrator",
};

export default function OnPremRoutesPage() {
  return (
    <EnvironmentRouteView
      environmentId="ON_PREM"
      eyebrow="Environment"
      title="On-prem"
      subtitle="Inside the organisation's own network on a brokered link — private, but not physically isolated, and a fixed pool rather than an elastic one."
      typicalWorkloads="Internal firewall and authentication log review, plus Confidential CVE and threat-intelligence work that must stay off public cloud without needing full isolation. Capacity is fixed, so a job larger than the free pool is refused here and falls to whichever environment its classification still permits."
    />
  );
}
