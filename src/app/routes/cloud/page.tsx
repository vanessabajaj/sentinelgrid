import type { Metadata } from "next";

import { EnvironmentRouteView } from "@/features/sentinel/components/environment-route-view";

export const metadata: Metadata = {
  title: "Cloud | Orchestrator",
};

export default function CloudRoutesPage() {
  return (
    <EnvironmentRouteView
      environmentId="CLOUD"
      eyebrow="Environment"
      title="Cloud"
      subtitle="Elastic, cheap, and externally networked — which is exactly why the clearance ceiling here is the lowest of the three."
      typicalWorkloads="High-volume, low-sensitivity analysis: public CVE research and open threat intelligence. Cloud scales past what the fixed pools can hold, so large Public-classified jobs land here. Nothing Confidential or above is ever eligible, because the data would leave the organisation's own network boundary."
    />
  );
}
