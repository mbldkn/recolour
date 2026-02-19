import { JobsRepo } from "../repositories/jobs.repo";
import { TicketsRepo } from "../repositories/tickets.repo";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function addSecondsIso(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export class QueueWorker {
  private running = false;
  private activeJobsPerPartner = new Map<string, number>();

  constructor(
    private jobsRepo: JobsRepo,
    private ticketsRepo: TicketsRepo,
    private partners: { id: string; concurrency: number }[]
  ) { }

  start() {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  stop() {
    this.running = false;
  }

  private async loop() {
    while (this.running) {
      try {
        for (const partner of this.partners) {
          const active = this.activeJobsPerPartner.get(partner.id) ?? 0;
          const available = partner.concurrency - active;

          for (let i = 0; i < available; i++) {
            const job = this.jobsRepo.claimNextForPartner(partner.id);
            if (!job) break;

            this.activeJobsPerPartner.set(partner.id, (this.activeJobsPerPartner.get(partner.id) ?? 0) + 1);
            this.processJob(job.id).finally(() => {
              this.activeJobsPerPartner.set(partner.id, (this.activeJobsPerPartner.get(partner.id) ?? 1) - 1);
            });
          }
        }
      } catch (err) {
        console.error("[QueueWorker] loop error:", err);
      }

      await sleep(500);
    }
  }

  private async processJob(jobId: string) {
    const job = this.jobsRepo.getById(jobId);
    if (!job) return;

    this.ticketsRepo.updateStatus(job.ticketId, "in_progress", "Partner started processing");

    try {
      await sleep(2000);

      const allowRandomFailure = process.env.NODE_ENV !== "test";
      if (allowRandomFailure && Math.random() < 0.2) {
        throw new Error("Simulated partner failure");
      }

      this.jobsRepo.setStatus(job.id, "done", { lastError: null });
      this.ticketsRepo.updateStatus(job.ticketId, "awaiting_approval", "Partner delivered result (awaiting approval)");
    } catch (err: any) {
      const attempts = job.attempts + 1;

      if (attempts >= job.maxAttempts) {
        this.jobsRepo.setStatus(job.id, "failed", {
          attempts,
          lastError: err?.message ?? "Unknown error",
        });
        this.ticketsRepo.updateStatus(job.ticketId, "rejected", "Partner job failed permanently");
        return;
      }

      const backoffSeconds = attempts === 1 ? 2 : attempts === 2 ? 5 : 10;

      this.jobsRepo.setStatus(job.id, "queued", {
        attempts,
        lastError: err?.message ?? "Unknown error",
        runAfter: addSecondsIso(backoffSeconds),
      });

      this.ticketsRepo.updateStatus(job.ticketId, "queued", `Partner failed, retry scheduled in ${backoffSeconds}s`);
    }
  }
}
