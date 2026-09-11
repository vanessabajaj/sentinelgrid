import type { Metadata } from "next";

import { DeploymentView } from "@/features/sentinel/components/deployment-view";

export const metadata: Metadata = {
  title: "Deployment | SentinelGrid",
};

export default function DeploymentPage() {
  return <DeploymentView />;
}
