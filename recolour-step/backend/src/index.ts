import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

import { setDb } from "./db/db";
import { initSchema } from "./db/schema";
import { createApp } from "./app";
import { QueueWorker } from "./queue/worker";

const DATA_DIR = path.resolve(process.cwd(), "backend", "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

setDb(db);
initSchema();

const { app, deps } = createApp();

const worker = new QueueWorker(deps.jobsRepo, deps.ticketsRepo, deps.partnersRepo.list());
worker.start();

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
