import { getDb } from "../db/db";
import type { Ticket, TicketHistory, TicketPhoto, TicketStatus, Priority } from "../types/models";

function nowIso() {
  return new Date().toISOString();
}

export class TicketsRepo {

  constructor () {}

  create(input: {
    id: string;
    photoSetId: string;
    priority: Priority;
    partnerId: string;
    status?: TicketStatus;
    photos: string[];
    referenceImagePath?: string | null;
  }): Ticket {
    const db = getDb();
    const createdAt = nowIso();
    const updatedAt = createdAt;
    const status: TicketStatus = input.status ?? "pending";

    const insertTicket = db.prepare(`
      INSERT INTO tickets (id, photoSetId, priority, partnerId, status, referenceImagePath, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPhoto = db.prepare(`
      INSERT INTO ticket_photos (ticketId, path) VALUES (?, ?)
    `);

    const insertHistory = db.prepare(`
      INSERT INTO ticket_history (id, ticketId, at, action) VALUES (?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      insertTicket.run(
        input.id,
        input.photoSetId,
        input.priority,
        input.partnerId,
        status,
        input.referenceImagePath ?? null,
        createdAt,
        updatedAt
      );

      for (const p of input.photos) insertPhoto.run(input.id, p);

      insertHistory.run(`h_${input.id}_created`, input.id, createdAt, "Ticket created");
    });

    tx();

    return {
      id: input.id,
      photoSetId: input.photoSetId,
      priority: input.priority,
      partnerId: input.partnerId,
      status,
      createdAt,
      updatedAt,
    };
  }

  list(filter?: { status?: TicketStatus; partnerId?: string; priority?: Priority }): (Ticket & { photos: string[] })[] {
    const db = getDb();

    const where: string[] = [];
    const params: any[] = [];

    if (filter?.status) {
      where.push(`t.status = ?`);
      params.push(filter.status);
    }
    if (filter?.partnerId) {
      where.push(`t.partnerId = ?`);
      params.push(filter.partnerId);
    }
    if (filter?.priority) {
      where.push(`t.priority = ?`);
      params.push(filter.priority);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const tickets = db
      .prepare(
        `
        SELECT t.id, t.photoSetId, t.priority, t.partnerId, t.status, t.createdAt, t.updatedAt
        FROM tickets t
        ${whereSql}
        ORDER BY CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END
      `
      )
      .all(...params) as Ticket[];

    if (tickets.length === 0) return [];

    const placeholders = tickets.map(() => "?").join(", ");
    const ticketIds = tickets.map((t) => t.id);
    const allPhotos = db
      .prepare(`SELECT ticketId, path FROM ticket_photos WHERE ticketId IN (${placeholders}) ORDER BY path`)
      .all(...ticketIds) as { ticketId: string; path: string }[];

    const photosByTicket = new Map<string, string[]>();
    for (const row of allPhotos) {
      const bucket = photosByTicket.get(row.ticketId);
      if (bucket) bucket.push(row.path);
      else photosByTicket.set(row.ticketId, [row.path]);
    }

    return tickets.map((t) => ({ ...t, photos: photosByTicket.get(t.id) ?? [] }));
  }

  getById(id: string): (Ticket & { photos: string[]; history: TicketHistory[] }) | null {
    const db = getDb();
    const ticket = db
      .prepare(`SELECT id, photoSetId, priority, partnerId, status, createdAt, updatedAt FROM tickets WHERE id = ?`)
      .get(id) as Ticket | undefined;

    if (!ticket) return null;

    const photos = db
      .prepare(`SELECT ticketId, path FROM ticket_photos WHERE ticketId = ? ORDER BY path`)
      .all(id) as TicketPhoto[];

    const history = db
      .prepare(`SELECT id, ticketId, at, action FROM ticket_history WHERE ticketId = ? ORDER BY at`)
      .all(id) as TicketHistory[];

    return {
      ...ticket,
      photos: photos.map((p) => p.path),
      history,
    };
  }

  updateStatus(id: string, status: TicketStatus, action: string) {
    const db = getDb();
    const updatedAt = nowIso();

    const update = db.prepare(`UPDATE tickets SET status = ?, updatedAt = ? WHERE id = ?`);
    const insertHistory = db.prepare(
      `INSERT INTO ticket_history (id, ticketId, at, action) VALUES (?, ?, ?, ?)`
    );

    const tx = db.transaction(() => {
      update.run(status, updatedAt, id);
      insertHistory.run(`h_${id}_${Date.now()}`, id, updatedAt, action);
    });

    tx();
  }
}
