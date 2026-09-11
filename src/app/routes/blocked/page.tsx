import type { Metadata } from "next";

import { BlockedRequestsView } from "@/features/sentinel/components/blocked-requests-view";

export const metadata: Metadata = {
  title: "Blocked Requests | SentinelGrid",
};

export default function BlockedRequestsPage() {
  return <BlockedRequestsView />;
}
