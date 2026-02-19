import { getDb } from "./db";

export function initSchema() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS partners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      concurrency INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      photoSetId TEXT NOT NULL,
      priority TEXT NOT NULL,
      partnerId TEXT NOT NULL,
      status TEXT NOT NULL,
      referenceImagePath TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (partnerId) REFERENCES partners(id)
    );


    CREATE TABLE IF NOT EXISTS ticket_photos (
      ticketId TEXT NOT NULL,
      path TEXT NOT NULL,
      PRIMARY KEY (ticketId, path),
      FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ticket_history (
      id TEXT PRIMARY KEY,
      ticketId TEXT NOT NULL,
      at TEXT NOT NULL,
      action TEXT NOT NULL,
      FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      ticketId TEXT NOT NULL UNIQUE,     
      partnerId TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      maxAttempts INTEGER NOT NULL DEFAULT 3,
      lastError TEXT,
      runAfter TEXT NOT NULL,          
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (partnerId) REFERENCES partners(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_partner ON tickets(partnerId);
    CREATE INDEX IF NOT EXISTS idx_jobs_status_runAfter ON jobs(status, runAfter);
  `);

  const row = db.prepare(`SELECT COUNT(*) as c FROM partners`).get() as { c: number };
  if (row.c === 0) {
    const insert = db.prepare(`INSERT INTO partners (id, name, concurrency) VALUES (?, ?, ?)`);
    const tx = db.transaction(() => {
      insert.run("p1", "Partner A", 1);
      insert.run("p2", "Partner B", 1);
    });
    tx();
  }
}
