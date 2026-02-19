import { getDb } from "../db/db";
import type { Job, JobStatus } from "../types/models";

function nowIso() {
  return new Date().toISOString();
}

export class JobsRepo {
  enqueue(input: { id: string; ticketId: string; partnerId: string; maxAttempts?: number }): Job {
    const db = getDb();
    const createdAt = nowIso();
    const updatedAt = createdAt;
    const runAfter = createdAt;
    const maxAttempts = input.maxAttempts ?? 3;

    try {
      db.prepare(
        `
        INSERT INTO jobs (id, ticketId, partnerId, status, attempts, maxAttempts, lastError, runAfter, createdAt, updatedAt)
        VALUES (?, ?, ?, 'queued', 0, ?, NULL, ?, ?, ?)
      `
      ).run(input.id, input.ticketId, input.partnerId, maxAttempts, runAfter, createdAt, updatedAt);
    } catch (e: any) {
      const existing = db.prepare(`SELECT * FROM jobs WHERE ticketId = ?`).get(input.ticketId) as Job | undefined;
      if (existing) return existing;
      throw e;
    }

    return db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(input.id) as Job;
  }

  list(): Job[] {
    const db = getDb();
    return db.prepare(`SELECT * FROM jobs ORDER BY createdAt DESC`).all() as Job[];
  }

  claimNextForPartner(partnerId: string): Job | null {
    const db = getDb();
    const now = nowIso();

    const tx = db.transaction(() => {
      const job = db
        .prepare(
          `
          SELECT * FROM jobs
          WHERE partnerId = ?
            AND status = 'queued'
            AND runAfter <= ?
          ORDER BY createdAt
          LIMIT 1
        `
        )
        .get(partnerId, now) as Job | undefined;

      if (!job) return null;

      db.prepare(`UPDATE jobs SET status = 'running', updatedAt = ? WHERE id = ?`).run(nowIso(), job.id);
      return db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(job.id) as Job;
    });

    return tx();
  }

  setStatus(id: string, status: JobStatus, patch?: Partial<Pick<Job, "attempts" | "lastError" | "runAfter">>) {
    const db = getDb();
    const updatedAt = nowIso();

    const attempts = patch?.attempts;
    const lastError = patch?.lastError ?? null;
    const runAfter = patch?.runAfter;

    const fields: string[] = ["status = ?", "updatedAt = ?"];
    const params: any[] = [status, updatedAt];

    if (attempts !== undefined) {
      fields.push("attempts = ?");
      params.push(attempts);
    }
    if (patch?.lastError !== undefined) {
      fields.push("lastError = ?");
      params.push(lastError);
    }
    if (runAfter !== undefined) {
      fields.push("runAfter = ?");
      params.push(runAfter);
    }

    params.push(id);

    db.prepare(`UPDATE jobs SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  }

  getById(id: string): Job | null {
    const db = getDb();
    return (db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(id) as Job) ?? null;
  }

  getByTicketId(ticketId: string): Job | null {
    const db = getDb();
    return (db.prepare(`SELECT * FROM jobs WHERE ticketId = ?`).get(ticketId) as Job) ?? null;
  }

  resetToQueued(ticketId: string): Job | null {
    const db = getDb();
    const now = new Date().toISOString();

    const job = db.prepare(`SELECT * FROM jobs WHERE ticketId = ?`).get(ticketId) as Job | undefined;
    if (!job) return null;

    db.prepare(`
    UPDATE jobs
    SET status = 'queued',
        maxAttempts = attempts + 3,
        lastError = NULL,
        runAfter = ?,
        updatedAt = ?
    WHERE ticketId = ?
  `).run(now, now, ticketId);

    return db.prepare(`SELECT * FROM jobs WHERE ticketId = ?`).get(ticketId) as Job;
  }
}
