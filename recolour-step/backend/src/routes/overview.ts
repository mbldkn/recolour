import { Router } from "express";
import { TicketsRepo } from "../repositories/tickets.repo";
import { PartnersRepo } from "../repositories/partners.repo";
import { requireRole } from "../middleware/role";

const STATUSES = [
  "pending",
  "queued",
  "in_progress",
  "awaiting_approval",
  "approved",
  "rejected",
] as const;

export function createOverviewRouter(partnersRepo: PartnersRepo, ticketsRepo: TicketsRepo) {
  const router = Router();

  router.get("/partners", requireRole("manager"), (_req, res) => {
    const partners = partnersRepo.list();
    const tickets = ticketsRepo.list({});

    const rows = partners.map((p) => {
      const pTickets = tickets.filter((t: any) => t.partnerId === p.id);
      const counts: Record<string, number> = {};
      for (const s of STATUSES) counts[s] = 0;
      for (const t of pTickets) counts[t.status] = (counts[t.status] ?? 0) + 1;

      return {
        partnerId: p.id,
        partnerName: p.name,
        concurrency: p.concurrency,
        total: pTickets.length,
        counts,
      };
    });

    res.json(rows);
  });

  return router;
}
