import type { SentinelDatabase } from "@/features/sentinel/persistence/database";
import type {
  AuditEntry,
  WorkloadResult,
} from "@/features/sentinel/types";

interface AuditRow {
  decision_id: string;
  timestamp: string;
  incident_title: string;
  classification: AuditEntry["classification"];
  outcome: AuditEntry["outcome"];
  selected_environment: AuditEntry["selectedEnvironment"];
  policy_version: string;
}

export class AuditRepository {
  constructor(private readonly database: SentinelDatabase) {}

  list(): AuditEntry[] {
    return this.database
      .prepare<[], AuditRow>(
        `SELECT
          decision_id,
          timestamp,
          incident_title,
          classification,
          outcome,
          selected_environment,
          policy_version
        FROM audit_records
        ORDER BY timestamp DESC, rowid DESC`,
      )
      .all()
      .map((row) => ({
        decisionId: row.decision_id,
        timestamp: row.timestamp,
        incidentTitle: row.incident_title,
        classification: row.classification,
        outcome: row.outcome,
        selectedEnvironment: row.selected_environment,
        policyVersion: row.policy_version,
      }));
  }

  save(result: WorkloadResult, entry: AuditEntry): void {
    this.database
      .prepare(
        `INSERT INTO audit_records(
          decision_id,
          incident_id,
          timestamp,
          policy_version,
          outcome,
          selected_environment,
          incident_title,
          classification,
          environment_evaluations_json,
          explanation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(decision_id) DO UPDATE SET
          timestamp = excluded.timestamp,
          outcome = excluded.outcome,
          selected_environment = excluded.selected_environment,
          environment_evaluations_json = excluded.environment_evaluations_json,
          explanation = excluded.explanation`,
      )
      .run(
        entry.decisionId,
        result.incident.id,
        entry.timestamp,
        entry.policyVersion,
        entry.outcome,
        entry.selectedEnvironment,
        entry.incidentTitle,
        entry.classification,
        JSON.stringify(result.decision?.evaluations ?? []),
        result.decision?.explanation ??
          "Quarantined because detected classification exceeds the declared classification.",
      );
  }

  count(): number {
    return (
      this.database
        .prepare<[], { count: number }>(
          "SELECT COUNT(*) AS count FROM audit_records",
        )
        .get()?.count ?? 0
    );
  }

  clear(): void {
    this.database.prepare("DELETE FROM audit_records").run();
  }
}
