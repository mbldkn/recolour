import Database from "better-sqlite3";
import request from "supertest";
import { setDb } from "../../src/db/db";
import { initSchema } from "../../src/db/schema";
import { createApp } from "../../src/app";
import { QueueWorker } from "../../src/queue/worker";

let app: any;
let worker: QueueWorker;

beforeAll(() => {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");

  setDb(db);
  initSchema();

  const created = createApp();
  app = created.app;

  worker = new QueueWorker(created.deps.jobsRepo, created.deps.ticketsRepo, created.deps.partnersRepo.list());
  worker.start();
});

afterAll(() => {
  worker.stop();
});

afterAll(() => worker.stop());

test("sending ticket twice does not create duplicate jobs", async () => {
    const create = await request(app)
        .post("/api/tickets")
        .set("x-role", "operator")
        .send({ photoSetId: "Ticket 1", priority: "high", partnerId: "p1" });

    const id = create.body.id;

    await request(app).post(`/api/tickets/${id}/action`).set("x-role", "operator").send({ action: "send_to_partner" });
    await request(app).post(`/api/tickets/${id}/action`).set("x-role", "operator").send({ action: "send_to_partner" });

    const jobs = await request(app).get("/api/jobs");
    const jobsForTicket = jobs.body.filter((j: any) => j.ticketId === id);

    expect(jobsForTicket.length).toBe(1);
});

test("cannot approve unless awaiting_approval", async () => {
    const create = await request(app)
        .post("/api/tickets")
        .set("x-role", "operator")
        .send({ photoSetId: "Ticket 2", priority: "high", partnerId: "p1" });

    const id = create.body.id;

    const res = await request(app)
        .post(`/api/tickets/${id}/action`)
        .set("x-role", "manager")
        .send({ action: "approve" });

    expect(res.status).toBe(400);
});

test("approved tickets appear in library", async () => {
    const create = await request(app)
        .post("/api/tickets")
        .set("x-role", "operator")
        .send({ photoSetId: "Ticket 3", priority: "high", partnerId: "p1" });

    const id = create.body.id;

    await request(app).post(`/api/tickets/${id}/action`).set("x-role", "operator").send({ action: "send_to_partner" });

    await waitForStatus(id, "awaiting_approval");

    await request(app).post(`/api/tickets/${id}/action`).set("x-role", "manager").send({ action: "approve" });

    const library = await request(app).get("/api/library/approved");
    expect(library.body.some((t: any) => t.id === id)).toBe(true);
}, 15000);

async function waitForStatus(id: string, status: string, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const res = await request(app).get(`/api/tickets/${id}`);
        if (res.body?.status === status) return;
        await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`Timeout waiting for status=${status}`);
}

