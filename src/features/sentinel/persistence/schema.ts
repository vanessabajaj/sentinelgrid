import type Database from "better-sqlite3";

const SCHEMA_VERSION = 1;

/** Applies committed, forward-only SQLite schema migrations. */
export function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = database
    .prepare<[number], { version: number }>(
      "SELECT version FROM schema_migrations WHERE version = ?",
    )
    .get(SCHEMA_VERSION);

  if (applied) {
    return;
  }

  database.transaction(() => {
    database.exec(`
      CREATE TABLE workloads (
        incident_id TEXT PRIMARY KEY,
        submitted_at TEXT NOT NULL,
        outcome TEXT NOT NULL,
        selected_environment TEXT,
        execution_status TEXT,
        result_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX workloads_submitted_at_idx
        ON workloads(submitted_at DESC);

      CREATE TABLE audit_records (
        decision_id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        outcome TEXT NOT NULL,
        selected_environment TEXT,
        incident_title TEXT NOT NULL,
        classification TEXT NOT NULL,
        environment_evaluations_json TEXT NOT NULL,
        explanation TEXT NOT NULL,
        FOREIGN KEY (incident_id) REFERENCES workloads(incident_id)
          ON DELETE CASCADE
      );

      CREATE INDEX audit_records_timestamp_idx
        ON audit_records(timestamp DESC);

      CREATE TABLE environment_state (
        environment_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        max_classification TEXT NOT NULL,
        network_mode TEXT NOT NULL,
        capacity INTEGER NOT NULL CHECK (capacity >= 0),
        used_capacity INTEGER NOT NULL
          CHECK (used_capacity >= 0 AND used_capacity <= capacity),
        baseline_used_capacity INTEGER NOT NULL
          CHECK (baseline_used_capacity >= 0 AND baseline_used_capacity <= capacity),
        online INTEGER NOT NULL CHECK (online IN (0, 1)),
        supported_incident_types_json TEXT NOT NULL
      );

      CREATE TABLE deployment_state (
        environment_id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        status TEXT NOT NULL,
        deployed_at TEXT NOT NULL,
        artifact_sha256 TEXT,
        artifact_size_bytes INTEGER,
        verification_status TEXT NOT NULL
      );

      CREATE TABLE application_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    database
      .prepare("INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)")
      .run(SCHEMA_VERSION, new Date().toISOString());
  })();
}
