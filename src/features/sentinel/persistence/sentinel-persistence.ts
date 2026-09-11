import type { SentinelDatabase } from "@/features/sentinel/persistence/database";
import { openDatabase } from "@/features/sentinel/persistence/database";
import { AuditRepository } from "@/features/sentinel/persistence/repositories/audit-repository";
import { DeploymentRepository } from "@/features/sentinel/persistence/repositories/deployment-repository";
import { EnvironmentRepository } from "@/features/sentinel/persistence/repositories/environment-repository";
import { WorkloadRepository } from "@/features/sentinel/persistence/repositories/workload-repository";
import type {
  AuditEntry,
  Environment,
  ModelDeployment,
  WorkloadResult,
} from "@/features/sentinel/types";

const INCIDENT_SEQUENCE_KEY = "incident_sequence";

export class SentinelPersistence {
  readonly workloads: WorkloadRepository;
  readonly audits: AuditRepository;
  readonly environments: EnvironmentRepository;
  readonly deployments: DeploymentRepository;

  constructor(
    readonly database: SentinelDatabase,
    private readonly baselineEnvironments: Environment[],
    private readonly baselineDeployments: ModelDeployment[],
  ) {
    this.workloads = new WorkloadRepository(database);
    this.audits = new AuditRepository(database);
    this.environments = new EnvironmentRepository(database);
    this.deployments = new DeploymentRepository(database);

    this.initialize();
  }

  private initialize(): void {
    this.database.transaction(() => {
      this.environments.initialize(this.baselineEnvironments);
      this.deployments.initialize(this.baselineDeployments);
      this.database
        .prepare(
          "INSERT OR IGNORE INTO application_state(key, value) VALUES (?, ?)",
        )
        .run(INCIDENT_SEQUENCE_KEY, "0");

      // An immediate worker lifecycle cannot resume across a process restart.
      this.environments.reconcileCapacityAfterRestart();
    })();
  }

  nextIncidentSequence(): number {
    return this.database.transaction(() => {
      this.database
        .prepare(
          `UPDATE application_state
           SET value = CAST(value AS INTEGER) + 1
           WHERE key = ?`,
        )
        .run(INCIDENT_SEQUENCE_KEY);

      const row = this.database
        .prepare<[string], { value: string }>(
          "SELECT value FROM application_state WHERE key = ?",
        )
        .get(INCIDENT_SEQUENCE_KEY);

      if (!row) {
        throw new Error("Incident sequence was not initialized.");
      }

      return Number.parseInt(row.value, 10);
    })();
  }

  persistResultAndAudit(result: WorkloadResult, entry: AuditEntry): void {
    this.database.transaction(() => {
      this.workloads.save(result);
      this.audits.save(result, entry);
    })();
  }

  reset(): void {
    this.database.transaction(() => {
      this.audits.clear();
      this.workloads.clear();
      this.environments.reset(this.baselineEnvironments);
      this.deployments.reset(this.baselineDeployments);
      this.database
        .prepare(
          `INSERT INTO application_state(key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        )
        .run(INCIDENT_SEQUENCE_KEY, "0");
    })();
  }

  close(): void {
    if (this.database.open) {
      this.database.close();
    }
  }
}

export function createPersistence(
  baselineEnvironments: Environment[],
  baselineDeployments: ModelDeployment[],
  databasePath?: string,
): SentinelPersistence {
  return new SentinelPersistence(
    openDatabase(databasePath),
    baselineEnvironments,
    baselineDeployments,
  );
}
