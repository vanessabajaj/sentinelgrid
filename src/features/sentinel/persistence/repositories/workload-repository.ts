import type { SentinelDatabase } from "@/features/sentinel/persistence/database";
import type { WorkloadResult } from "@/features/sentinel/types";

interface WorkloadRow {
  result_json: string;
}

export class WorkloadRepository {
  constructor(private readonly database: SentinelDatabase) {}

  list(): WorkloadResult[] {
    const rows = this.database
      .prepare<[], WorkloadRow>(
        "SELECT result_json FROM workloads ORDER BY submitted_at DESC, rowid DESC",
      )
      .all();

    return rows.map((row) => JSON.parse(row.result_json) as WorkloadResult);
  }

  findByIncidentId(incidentId: string): WorkloadResult | null {
    const row = this.database
      .prepare<[string], WorkloadRow>(
        "SELECT result_json FROM workloads WHERE incident_id = ?",
      )
      .get(incidentId);

    return row ? (JSON.parse(row.result_json) as WorkloadResult) : null;
  }

  save(result: WorkloadResult): void {
    this.database
      .prepare(
        `INSERT INTO workloads(
          incident_id,
          submitted_at,
          outcome,
          selected_environment,
          execution_status,
          result_json,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(incident_id) DO UPDATE SET
          outcome = excluded.outcome,
          selected_environment = excluded.selected_environment,
          execution_status = excluded.execution_status,
          result_json = excluded.result_json,
          updated_at = excluded.updated_at`,
      )
      .run(
        result.incident.id,
        result.incident.submittedAt,
        result.outcome,
        result.decision?.selectedEnvironment ?? null,
        result.executionStatus,
        JSON.stringify(result),
        new Date().toISOString(),
      );
  }

  count(): number {
    return (
      this.database
        .prepare<[], { count: number }>("SELECT COUNT(*) AS count FROM workloads")
        .get()?.count ?? 0
    );
  }

  clear(): void {
    this.database.prepare("DELETE FROM workloads").run();
  }
}
