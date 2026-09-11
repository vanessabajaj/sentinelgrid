import type { SentinelDatabase } from "@/features/sentinel/persistence/database";
import type {
  EnvironmentId,
  ModelDeployment,
} from "@/features/sentinel/types";

interface DeploymentRow {
  environment_id: EnvironmentId;
  version: string;
  status: ModelDeployment["status"];
  deployed_at: string;
  artifact_sha256: string | null;
  artifact_size_bytes: number | null;
  verification_status: ModelDeployment["verificationStatus"];
}

export class DeploymentRepository {
  constructor(private readonly database: SentinelDatabase) {}

  initialize(deployments: ModelDeployment[]): void {
    const insert = this.database.prepare(
      `INSERT OR IGNORE INTO deployment_state(
        environment_id,
        version,
        status,
        deployed_at,
        artifact_sha256,
        artifact_size_bytes,
        verification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    this.database.transaction(() => {
      for (const deployment of deployments) {
        insert.run(
          deployment.environmentId,
          deployment.version,
          deployment.status,
          deployment.deployedAt,
          deployment.artifactSha256,
          deployment.artifactSizeBytes,
          deployment.verificationStatus,
        );
      }
    })();
  }

  list(): ModelDeployment[] {
    return this.database
      .prepare<[], DeploymentRow>(
        `SELECT
          environment_id,
          version,
          status,
          deployed_at,
          artifact_sha256,
          artifact_size_bytes,
          verification_status
        FROM deployment_state
        ORDER BY rowid`,
      )
      .all()
      .map((row) => ({
        environmentId: row.environment_id,
        version: row.version,
        status: row.status,
        deployedAt: row.deployed_at,
        artifactSha256: row.artifact_sha256,
        artifactSizeBytes: row.artifact_size_bytes,
        verificationStatus: row.verification_status,
      }));
  }

  save(deployment: ModelDeployment): void {
    this.database
      .prepare(
        `UPDATE deployment_state SET
          version = ?,
          status = ?,
          deployed_at = ?,
          artifact_sha256 = ?,
          artifact_size_bytes = ?,
          verification_status = ?
        WHERE environment_id = ?`,
      )
      .run(
        deployment.version,
        deployment.status,
        deployment.deployedAt,
        deployment.artifactSha256,
        deployment.artifactSizeBytes,
        deployment.verificationStatus,
        deployment.environmentId,
      );
  }

  reset(deployments: ModelDeployment[]): void {
    this.database.prepare("DELETE FROM deployment_state").run();
    this.initialize(deployments);
  }

  count(): number {
    return (
      this.database
        .prepare<[], { count: number }>(
          "SELECT COUNT(*) AS count FROM deployment_state",
        )
        .get()?.count ?? 0
    );
  }
}
