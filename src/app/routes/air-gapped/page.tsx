import type { Metadata } from "next";

import { EnvironmentRouteView } from "@/features/sentinel/components/environment-route-view";

export const metadata: Metadata = {
  title: "Air-gapped | Orchestrator",
};

export default function AirGappedRoutesPage() {
  return (
    <EnvironmentRouteView
      environmentId="AIR_GAPPED"
      eyebrow="Environment"
      title="Air-gapped"
      subtitle="No inbound or outbound network path at all. The strongest isolation available, and the only environment cleared for Secret and Classified work."
      typicalWorkloads="Classified enclave telemetry and the most sensitive Secret-tier analysis — anything policy requires to never touch an external or even a brokered network. That isolation cuts both ways: the enclave cannot be reached over a network, so even the model artefact it runs arrives by one-way diode and manual import. See the Deployment surface for the full transfer path."
    />
  );
}
