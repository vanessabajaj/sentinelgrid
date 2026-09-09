import type {
  Classification,
  EnvironmentId,
  NetworkMode,
} from "@/features/sentinel/types";

export const POLICY_VERSION = "SG-POLICY-1.0";

export const CLASSIFICATION_RANK: Readonly<Record<Classification, number>> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  SECRET: 3,
  CLASSIFIED: 4,
};

export const ENVIRONMENT_PREFERENCE: Readonly<
  Record<Classification, readonly EnvironmentId[]>
> = {
  PUBLIC: ["CLOUD", "ON_PREM", "AIR_GAPPED"],
  INTERNAL: ["ON_PREM", "AIR_GAPPED"],
  CONFIDENTIAL: ["ON_PREM", "AIR_GAPPED"],
  SECRET: ["AIR_GAPPED"],
  CLASSIFIED: ["AIR_GAPPED"],
};

export const NETWORK_CAPABILITY_RANK: Readonly<Record<NetworkMode, number>> = {
  NONE: 0,
  CONTROLLED: 1,
  EXTERNAL: 2,
};

export function isClassificationAllowed(
  classification: Classification,
  maximumClassification: Classification,
): boolean {
  return (
    CLASSIFICATION_RANK[classification] <=
    CLASSIFICATION_RANK[maximumClassification]
  );
}

export function canSatisfyNetworkMode(
  environmentMode: NetworkMode,
  requiredMode: NetworkMode,
): boolean {
  return (
    NETWORK_CAPABILITY_RANK[environmentMode] >=
    NETWORK_CAPABILITY_RANK[requiredMode]
  );
}

export function getEnvironmentPreferenceScore(
  classification: Classification,
  environmentId: EnvironmentId,
): number {
  const preferences = ENVIRONMENT_PREFERENCE[classification];
  const preferenceIndex = preferences.indexOf(environmentId);

  return preferenceIndex === -1 ? 0 : preferences.length - preferenceIndex;
}
