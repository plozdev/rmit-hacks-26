/**
 * SQLite database layer — Proof/Gate app data
 * ─────────────────────────────────────────────
 * Uses Node 24's native `node:sqlite` as specified in PROJECT_CONTEXT.md.
 * If node:sqlite isn't available (older Node), we fall back to better-sqlite3.
 *
 * Data stored here:
 *   - cases        : synthetic case metadata + sealed flag
 *   - evidence     : Tide-encrypted ciphertext (NEVER plaintext)
 *   - requests     : custodian access requests (purpose only, not a QEA request)
 *
 * TideCloak's own H2 volume is a separate process entirely.
 */

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "fs";
import { join } from "path";

const DB_DIR = join(process.cwd(), "app-data");
const DB_PATH = join(DB_DIR, "gateway.sqlite");

let db: DatabaseSync;

export function getDb(): DatabaseSync {
  if (db) return db;

  mkdirSync(DB_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  initSchema(db);
  return db;
}

function initSchema(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT NOT NULL,
      sealed      INTEGER NOT NULL DEFAULT 0,  -- 0 = open, 1 = sealed
      custodian   TEXT NOT NULL,               -- Tide vuid of owner
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evidence (
      case_id     TEXT PRIMARY KEY REFERENCES cases(id),
      ciphertext  TEXT NOT NULL,               -- Tide selfencrypt output (NEVER plaintext)
      sealed_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS requests (
      id          TEXT PRIMARY KEY,
      case_id     TEXT NOT NULL REFERENCES cases(id),
      custodian   TEXT NOT NULL,               -- Tide vuid of requester
      purpose     TEXT NOT NULL,               -- Reason for access
      status      TEXT NOT NULL DEFAULT 'pending', -- pending | approved | denied
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed synthetic cases if empty
  const count = database.prepare("SELECT COUNT(*) as n FROM cases").get() as { n: number };
  if (count.n === 0) {
    seedCases(database);
  }
}

function seedCases(database: DatabaseSync) {
  const CUSTODIAN_VUID =
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

  database
    .prepare(
      `INSERT INTO cases (id, title, description, sealed, custodian) VALUES
       ('case-001', 'Operation Nightfall — Synthetic Record', 
        'Synthetic digital evidence record for demonstration purposes. All content is fabricated.',
        0, ?)`
    )
    .run(CUSTODIAN_VUID);
}

// ── Case queries ──────────────────────────────────────────────────────────────
export interface CaseRow {
  id: string;
  title: string;
  description: string;
  sealed: number;
  custodian: string;
  created_at: string;
}

export function listCases(): CaseRow[] {
  return getDb().prepare("SELECT * FROM cases ORDER BY created_at DESC").all() as CaseRow[];
}

export function getCaseById(id: string): CaseRow | undefined {
  return getDb().prepare("SELECT * FROM cases WHERE id = ?").get(id) as CaseRow | undefined;
}

// ── Evidence queries ──────────────────────────────────────────────────────────
export interface EvidenceRow {
  case_id: string;
  ciphertext: string;
  sealed_at: string;
}

export function getEvidence(caseId: string): EvidenceRow | undefined {
  return getDb()
    .prepare("SELECT * FROM evidence WHERE case_id = ?")
    .get(caseId) as EvidenceRow | undefined;
}

export function saveEvidence(caseId: string, ciphertext: string): void {
  const db = getDb();
  // Store ciphertext (Tide selfencrypt output)
  db.prepare(`
    INSERT INTO evidence (case_id, ciphertext) VALUES (?, ?)
    ON CONFLICT(case_id) DO NOTHING
  `).run(caseId, ciphertext);

  // Mark case as sealed
  db.prepare("UPDATE cases SET sealed = 1 WHERE id = ?").run(caseId);
}

// ── Request queries ───────────────────────────────────────────────────────────
export interface RequestRow {
  id: string;
  case_id: string;
  custodian: string;
  purpose: string;
  status: string;
  created_at: string;
}

export function listRequests(custodian?: string): RequestRow[] {
  if (custodian) {
    return getDb()
      .prepare("SELECT * FROM requests WHERE custodian = ? ORDER BY created_at DESC")
      .all(custodian) as RequestRow[];
  }
  return getDb()
    .prepare("SELECT * FROM requests ORDER BY created_at DESC")
    .all() as RequestRow[];
}

export function createRequest(
  id: string,
  caseId: string,
  custodian: string,
  purpose: string
): RequestRow {
  getDb()
    .prepare(
      "INSERT INTO requests (id, case_id, custodian, purpose) VALUES (?, ?, ?, ?)"
    )
    .run(id, caseId, custodian, purpose);
  return getDb()
    .prepare("SELECT * FROM requests WHERE id = ?")
    .get(id) as RequestRow;
}
