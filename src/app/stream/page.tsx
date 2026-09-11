import type { Metadata } from "next";

import { StreamView } from "@/features/sentinel/components/stream-view";

export const metadata: Metadata = {
  title: "Request stream | Orchestrator",
};

export default function StreamPage() {
  return <StreamView />;
}
