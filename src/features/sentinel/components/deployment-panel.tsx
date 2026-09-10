"use client";

import { useCallback, useEffect, useState } from "react";

import { formatEnvironmentLabel } from "@/features/sentinel/components/display-utils";
import type {
  AirGapDeploymentResult,
  ArtifactVerificationStatus,
  DeploymentPipelineStep,
  DeploymentStatus,
  EnvironmentId,
  ModelArtifact,
} from "@/features/sentinel/types";

const ENVIRONMENT_ORDER: EnvironmentId[] = ["CLOUD", "ON_PREM", "AIR_GAPPED"];

const STATUS_LABELS: Record<DeploymentStatus, string> = {
  ACTIVE: "Active",
  UPDATE_PENDING: "Update pending",
  DEPLOYING: "Deploying",
};

const STATUS_STYLES: Record<DeploymentStatus, string> = {
  ACTIVE: "border-success/35 bg-success/10 text-success",
  UPDATE_PENDING: "border-warning/35 bg-warning/10 text-warning",
  DEPLOYING: "border-accent/35 bg-accent/10 text-accent",
};

const VERIFICATION_STYLES: Record<ArtifactVerificationStatus, string> = {
  VERIFIED: "text-success",
  PENDING: "text-warning",
  FAILED: "text-danger",
};

function truncateSha(sha256: string): string {
  return `${sha256.slice(0, 8)}…${sha256.slice(-4)}`;
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1_024) {
    return `${sizeBytes} B`;
  }

  return `${(sizeBytes / 1_024).toFixed(1)} KB`;
}

export function DeploymentPanel() {
  const [artifact, setArtifact] = useState<ModelArtifact | null>(null);
  const [steps, setSteps] = useState<DeploymentPipelineStep[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/deployment", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Deployment status request failed.");
        }

        return response.json();
      })
      .then((payload: { artifact: ModelArtifact }) => {
        if (!cancelled) {
          setArtifact(payload.artifact);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load deployment status.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeploy = useCallback(async () => {
    setIsDeploying(true);
    setError(null);

    try {
      const response = await fetch("/api/deployment/air-gap", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Deployment request failed.");
      }

      const result: AirGapDeploymentResult = await response.json();
      setArtifact(result.artifact);
      setSteps(result.steps);

      if (!result.verificationPassed) {
        setError(result.failureReason ?? "Artifact checksum verification failed.");
      }
    } catch {
      setError("Could not complete the air-gap deployment pipeline.");
    } finally {
      setIsDeploying(false);
    }
  }, []);

  if (!artifact) {
    return null;
  }

  const airGap = artifact.deployments.find(
    (deployment) => deployment.environmentId === "AIR_GAPPED",
  );
  const canDeploy =
    !isDeploying &&
    airGap !== undefined &&
    (airGap.status !== "ACTIVE" || airGap.version !== artifact.latestVersion);

  return (
    <section
      className="rounded-md border border-border bg-panel"
      aria-labelledby="deployment-heading"
    >
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Model artifact
          </p>
          <h2
            id="deployment-heading"
            className="mt-1 text-lg font-semibold text-white"
          >
            {artifact.name} v{artifact.latestVersion}
          </h2>
          <p className="mt-1 font-mono text-xs text-muted">
            Prepared artifact package · {formatBytes(artifact.sizeBytes)}
          </p>
        </div>
        {canDeploy ? (
          <button
            type="button"
            onClick={() => void handleDeploy()}
            disabled={isDeploying}
            className="inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeploying ? "Deploying…" : "Deploy to Air-Gapped"}
          </button>
        ) : null}
      </div>

      <div className="border-b border-border px-5 py-4 sm:px-6">
        <dl className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <div className="min-w-0">
            <dt className="text-xs text-muted">Artifact SHA-256</dt>
            <dd className="mt-1 break-all font-mono text-xs text-foreground">
              {artifact.sha256}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Artifact size</dt>
            <dd className="mt-1 font-mono text-xs font-semibold text-white">
              {formatBytes(artifact.sizeBytes)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Verification</dt>
            <dd
              className={`mt-1 font-mono text-xs font-semibold ${
                artifact.verified ? "text-success" : "text-danger"
              }`}
            >
              {artifact.verified ? "Verified" : "Failed"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-3 p-5 sm:p-6 md:grid-cols-3">
        {ENVIRONMENT_ORDER.map((environmentId) => {
          const deployment = artifact.deployments.find(
            (candidate) => candidate.environmentId === environmentId,
          );

          if (!deployment) {
            return null;
          }

          return (
            <div
              key={environmentId}
              className="rounded-md border border-border bg-surface p-4"
            >
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                {formatEnvironmentLabel(environmentId)}
              </p>
              <p className="mt-2 font-mono text-sm font-semibold text-white">
                v{deployment.version}
              </p>
              <dl className="mt-3 space-y-2 border-y border-border py-3">
                <div>
                  <dt className="text-[11px] text-muted">Artifact checksum</dt>
                  <dd className="mt-0.5 font-mono text-[11px] text-foreground">
                    {deployment.artifactSha256
                      ? truncateSha(deployment.artifactSha256)
                      : "Awaiting import"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted">Artifact size</dt>
                  <dd className="mt-0.5 font-mono text-[11px] text-foreground">
                    {deployment.artifactSizeBytes === null
                      ? "Not recorded"
                      : formatBytes(deployment.artifactSizeBytes)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted">Verification</dt>
                  <dd
                    className={`mt-0.5 font-mono text-[11px] font-semibold ${VERIFICATION_STYLES[deployment.verificationStatus]}`}
                  >
                    {deployment.verificationStatus}
                  </dd>
                </div>
              </dl>
              <span
                className={`mt-3 inline-flex rounded border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[deployment.status]}`}
              >
                {deployment.status === "ACTIVE" ? "✓ " : "⚠ "}
                {STATUS_LABELS[deployment.status]}
              </span>
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="mx-5 mb-5 rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger sm:mx-6">
          {error}
        </div>
      ) : null}

      {steps.length > 0 ? (
        <div className="border-t border-border px-5 py-4 sm:px-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            Air-gap transfer pipeline
          </p>
          <ol className="mt-3 flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <li
                key={step.name}
                className={`flex items-center gap-2 rounded border px-2.5 py-1.5 font-mono text-[11px] ${
                  step.status === "COMPLETED"
                    ? "border-success/30 bg-success/5 text-success"
                    : "border-danger/30 bg-danger/5 text-danger"
                }`}
              >
                <span aria-hidden="true">
                  {step.status === "COMPLETED" ? "✓" : "!"}
                </span>
                {index + 1}. {step.name}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
