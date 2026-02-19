import { Router } from "express";
import { TicketsRepo } from "../repositories/tickets.repo";

export function createLibraryRouter(ticketsRepo: TicketsRepo) {
  const router = Router();

  router.get("/approved", (_req, res) => {
    const items = ticketsRepo.list({ status: "approved" as any });
    res.json(items);
  });

  return router;
}
