import type { SentinelDatabase } from "@/features/sentinel/persistence/database";
import type {
  Environment,
  EnvironmentId,
  IncidentType,
} from "@/features/sentinel/types";

interface EnvironmentRow {
  environment_id: EnvironmentId;
  display_name: string;
  max_classification: Environment["maxClassification"];
  network_mode: Environment["networkMode"];
  capacity: number;
  used_capacity: number;
  online: number;
  supported_incident_types_json: string;
}

export class EnvironmentRepository {
  constructor(private readonly database: SentinelDatabase) {}

  initialize(environments: Environment[]): void {
    const insert = this.database.prepare(
      `INSERT OR IGNORE INTO environment_state(
        environment_id,
        display_name,
        max_classification,
        network_mode,
        capacity,
        used_capacity,
        baseline_used_capacity,
        online,
        supported_incident_types_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    this.database.transaction(() => {
      for (const environment of environments) {
        insert.run(
          environment.id,
          environment.displayName,
          environment.maxClassification,
          environment.networkMode,
          environment.capacity,
          environment.usedCapacity,
          environment.usedCapacity,
          environment.online ? 1 : 0,
          JSON.stringify(environment.supportedIncidentTypes),
        );
      }
    })();
  }

  /** No asynchronous jobs survive a control-plane restart, so reclaim them. */
  reconcileCapacityAfterRestart(): void {
    this.database
      .prepare(
        `UPDATE environment_state
         SET used_capacity = baseline_used_capacity
         WHERE used_capacity != baseline_used_capacity`,
      )
      .run();
  }

  list(): Environment[] {
    return this.database
      .prepare<[], EnvironmentRow>(
        `SELECT
          environment_id,
          display_name,
          max_classification,
          network_mode,
          capacity,
          used_capacity,
          online,
          supported_incident_types_json
        FROM environment_state
        ORDER BY rowid`,
      )
      .all()
      .map((row) => ({
        id: row.environment_id,
        displayName: row.display_name,
        maxClassification: row.max_classification,
        networkMode: row.network_mode,
        capacity: row.capacity,
        usedCapacity: row.used_capacity,
        online: row.online === 1,
        workerStatus: "UNKNOWN",
        supportedIncidentTypes: JSON.parse(
          row.supported_incident_types_json,
        ) as IncidentType[],
      }));
  }

  allocate(environmentId: EnvironmentId, units: number): void {
    const result = this.database
      .prepare(
        `UPDATE environment_state
         SET used_capacity = used_capacity + ?
         WHERE environment_id = ?
           AND used_capacity + ? <= capacity`,
      )
      .run(units, environmentId, units);

    if (result.changes !== 1) {
      throw new Error(
        `${environmentId} cannot allocate ${units} capacity units.`,
      );
    }
  }

  release(environmentId: EnvironmentId, units: number): void {
    this.database
      .prepare(
        `UPDATE environment_state
         SET used_capacity = MAX(0, used_capacity - ?)
         WHERE environment_id = ?`,
      )
      .run(units, environmentId);
  }

  reset(environments: Environment[]): void {
    this.database.prepare("DELETE FROM environment_state").run();
    this.initialize(environments);
  }

  count(): number {
    return (
      this.database
        .prepare<[], { count: number }>(
          "SELECT COUNT(*) AS count FROM environment_state",
        )
        .get()?.count ?? 0
    );
  }
}
