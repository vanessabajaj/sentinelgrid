import type { DeploymentArtifact } from "@/features/sentinel/types";

/**
 * Local demonstration fixture. Describes one AI model artifact promoted
 * through all three environments, and the simulated transfer path used to
 * reach the air-gapped enclave (an export → one-way data-diode → manual
 * verified import sequence, since the enclave has no inbound network path).
 */
export const mockDeploymentArtifact = {
  id: "sentinel-triage-model",
  displayName: "sentinel-triage-model",
  description:
    "The incident-triage model referenced by SentinelAI analysis. The same signed artifact and checksum is present in all three environments — only the transfer path differs.",
  environments: [
    {
      environmentId: "CLOUD",
      version: "2.4.0",
      checksum: "sha256:8f2c1a9e5d3b7f10",
      deployedAt: "2026-09-08T14:02:00.000Z",
      verified: true,
    },
    {
      environmentId: "ON_PREM",
      version: "2.4.0",
      checksum: "sha256:8f2c1a9e5d3b7f10",
      deployedAt: "2026-09-08T15:47:00.000Z",
      verified: true,
    },
    {
      environmentId: "AIR_GAPPED",
      version: "2.4.0",
      checksum: "sha256:8f2c1a9e5d3b7f10",
      deployedAt: "2026-09-09T09:15:00.000Z",
      verified: true,
    },
  ],
  transferLog: [
    {
      id: "step-1",
      fromEnvironmentId: null,
      toEnvironmentId: "CLOUD",
      method: "CI_CD_PUBLISH",
      description:
        "Model artifact v2.4.0 built, signed, and published to the Cloud registry via the CI/CD pipeline. Checksum sha256:8f2c1a9e5d3b7f10 recorded as the source of truth.",
      occurredAt: "2026-09-08T14:02:00.000Z",
    },
    {
      id: "step-2",
      fromEnvironmentId: "CLOUD",
      toEnvironmentId: "ON_PREM",
      method: "CONTROLLED_NETWORK_SYNC",
      description:
        "On-Prem pulled the signed artifact over the controlled (non-public) network link. Signature and checksum verified before activation.",
      occurredAt: "2026-09-08T15:47:00.000Z",
    },
    {
      id: "step-3",
      fromEnvironmentId: "ON_PREM",
      toEnvironmentId: "AIR_GAPPED",
      method: "DATA_DIODE_EXPORT",
      description:
        "Artifact and its signature were exported from On-Prem onto write-once removable media through a one-way data diode. No return channel exists — this is a physical, outbound-only transfer.",
      occurredAt: "2026-09-09T08:40:00.000Z",
    },
    {
      id: "step-4",
      fromEnvironmentId: "AIR_GAPPED",
      toEnvironmentId: "AIR_GAPPED",
      method: "MANUAL_VERIFIED_IMPORT",
      description:
        "An enclave operator manually imported the media, independently recomputed the checksum, confirmed it matched sha256:8f2c1a9e5d3b7f10, and activated v2.4.0 inside the air-gapped enclave.",
      occurredAt: "2026-09-09T09:15:00.000Z",
    },
  ],
} satisfies DeploymentArtifact;
