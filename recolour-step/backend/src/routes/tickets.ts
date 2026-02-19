import { Router } from "express";
import { TicketsRepo } from "../repositories/tickets.repo";
import { readPhotosets } from "../services/photosets.service";
import { JobsRepo } from "../repositories/jobs.repo";
import { getRole, requireRole } from "../middleware/role";

function newId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createTicketsRouter(opts: { ticketsRepo: TicketsRepo; jobsRepo: JobsRepo; assetsDir: string }) {
    const router = Router();
    const { ticketsRepo, assetsDir } = opts;

    router.get("/", (req, res) => {
        const allowedStatuses = new Set([
            "pending",
            "queued",
            "in_progress",
            "awaiting_approval",
            "approved",
            "rejected",
        ]);

        const statusRaw = req.query.status as string | undefined;
        const status = statusRaw && allowedStatuses.has(statusRaw) ? (statusRaw as any) : undefined;

        const partnerId = (req.query.partnerId as string) || undefined;
        const priority = req.query.priority as any;

        const tickets = ticketsRepo.list({ status, partnerId, priority });
        res.json(tickets);
    });

    router.get("/:id", (req, res) => {
        const ticket = ticketsRepo.getById(req.params.id);
        if (!ticket) return res.status(404).json({ error: "Ticket not found" });
        res.json(ticket);
    });

    router.post("/", requireRole("operator"), (req, res) => {
        const { photoSetId, priority, partnerId } = req.body ?? {};

        if (!photoSetId || !priority || !partnerId) {
            return res.status(400).json({ error: "photoSetId, priority, partnerId are required" });
        }

        const set = readPhotosets(assetsDir).find((s) => s.id === photoSetId);
        if (!set) return res.status(400).json({ error: "Invalid photoSetId" });

        const id = newId("t");

        const created = ticketsRepo.create({
            id,
            photoSetId,
            priority,
            partnerId,
            photos: set.productPhotos,
            referenceImagePath: set.referenceImage,
            status: "pending",
        });

        return res.status(201).json({
            ...created,
            referenceImage: set.referenceImage,
            productPhotos: set.productPhotos,
        });
    });

    router.post("/:id/send", requireRole("operator"), (req, res) => {
        const id = req.params.id;
        const ticket = ticketsRepo.getById(id);
        if (!ticket) return res.status(404).json({ error: "Ticket not found" });

        if (ticket.status !== "pending" && ticket.status !== "rejected") {
            return res.status(400).json({ error: `Cannot send ticket in status ${ticket.status}` });
        }

        const job = opts.jobsRepo.enqueue({
            id: `j_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            ticketId: id,
            partnerId: ticket.partnerId,
            maxAttempts: 3,
        });

        ticketsRepo.updateStatus(id, "queued", "Enqueued to partner");

        res.json({ ok: true, job });
    });

    router.post("/:id/action", (req, res) => {
        const { action } = req.body ?? {};
        const ticket = ticketsRepo.getById(req.params.id);
        if (!ticket) return res.status(404).json({ error: "Ticket not found" });

        if (action === "approve") {
            if (getRole(req) !== "manager") return res.status(403).json({ error: "Forbidden: requires manager role" });
            if (ticket.status !== "awaiting_approval") {
                return res.status(400).json({ error: "Ticket not awaiting approval" });
            }
            ticketsRepo.updateStatus(ticket.id, "approved", "Ticket approved");
            return res.json({ ok: true });
        }

        if (action === "reject") {
            if (getRole(req) !== "manager") return res.status(403).json({ error: "Forbidden: requires manager role" });
            if (ticket.status !== "awaiting_approval") {
                return res.status(400).json({ error: "Ticket not awaiting approval" });
            }
            ticketsRepo.updateStatus(ticket.id, "rejected", "Ticket rejected");
            return res.json({ ok: true });
        }

        if (action === "send_to_partner") {
            if (getRole(req) !== "operator") return res.status(403).json({ error: "Forbidden: requires operator role" });

            const existing = opts.jobsRepo.getByTicketId(ticket.id);

            let job;
            if (!existing) {
                job = opts.jobsRepo.enqueue({
                    id: `j_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                    ticketId: ticket.id,
                    partnerId: ticket.partnerId,
                    maxAttempts: 3,
                });
            } else if (existing.status === "queued" || existing.status === "running") {
                job = existing;
            } else {
                job = opts.jobsRepo.resetToQueued(ticket.id);
            }

            ticketsRepo.updateStatus(ticket.id, "queued", "Enqueued to partner");
            return res.json({ ok: true, job });
        }

        return res.status(400).json({ error: "Unknown action" });
    });

    return router;
}
