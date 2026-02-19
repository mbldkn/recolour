import { getDb } from "../db/db";
import type { Partner } from "../types/models";

export class PartnersRepo {
    constructor() {
    }

    list(): Partner[] {
        const db = getDb();
        return db.prepare(`SELECT id, name, concurrency FROM partners ORDER BY name`).all() as Partner[];
    }

    getById(id: string): Partner | null {
        const db = getDb();
        const row = db.prepare(`SELECT id, name, concurrency FROM partners WHERE id = ?`).get(id);
        return (row as Partner) ?? null;
    }
}
