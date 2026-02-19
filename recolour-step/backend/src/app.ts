import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";

import { initSchema } from "./db/schema";
import { PartnersRepo } from "./repositories/partners.repo";
import { TicketsRepo } from "./repositories/tickets.repo";
import { JobsRepo } from "./repositories/jobs.repo";
import { createPhotosetsRouter } from "./routes/photosets";
import { createTicketsRouter } from "./routes/tickets";
import { createLibraryRouter } from "./routes/library";
import { createOverviewRouter } from "./routes/overview";

export function createApp() {
    initSchema();

    const app = express();
    app.use(cors());
    app.use(express.json());

    const ASSETS_DIR =
        process.env.ASSETS_DIR ??
        path.resolve(process.cwd(), "..", "..", "recolour-case");

    if (fs.existsSync(ASSETS_DIR)) {
        app.use("/assets", express.static(ASSETS_DIR));
    }

    const partnersRepo = new PartnersRepo();
    const ticketsRepo = new TicketsRepo();
    const jobsRepo = new JobsRepo();

    app.get("/api/partners", (_req, res) => res.json(partnersRepo.list()));
    app.use("/api/photosets", createPhotosetsRouter(ASSETS_DIR));
    app.use(
        "/api/tickets",
        createTicketsRouter({ ticketsRepo, jobsRepo, assetsDir: ASSETS_DIR })
    );
    app.use("/api/library", createLibraryRouter(ticketsRepo));
    app.use("/api/overview", createOverviewRouter(partnersRepo, ticketsRepo));

    app.get("/api/jobs", (_req, res) => res.json(jobsRepo.list()));

    return {
        app,
        deps: {
            ticketsRepo,
            jobsRepo,
            partnersRepo
        }
    };
}
