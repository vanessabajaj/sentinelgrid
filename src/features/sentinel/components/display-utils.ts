import type { EnvironmentId } from "@/features/sentinel/types";

const ENVIRONMENT_LABELS: Record<EnvironmentId, string> = {
  CLOUD: "Cloud",
  ON_PREM: "On-Prem",
  AIR_GAPPED: "Air-Gapped",
};

export function formatEnumLabel(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function formatEnvironmentLabel(id: EnvironmentId): string {
  return ENVIRONMENT_LABELS[id];
}

export function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}
