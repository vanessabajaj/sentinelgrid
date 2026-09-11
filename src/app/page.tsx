import { mockIncidents } from "@/data/mock-sentinel-data";
import { SentinelWorkspace } from "@/features/sentinel/components/sentinel-workspace";

export default function Home() {
  return <SentinelWorkspace demoIncidents={mockIncidents} />;
}
