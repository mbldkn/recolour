export type TicketStatus =
  | "pending"
  | "queued"
  | "in_progress"
  | "awaiting_approval"
  | "approved"
  | "rejected";

export type Priority = "low" | "medium" | "high";

export interface Ticket {
  id: string;
  photoSetId: string;
  priority: Priority;
  partnerId: string;
  status: TicketStatus;
  referenceImagePath?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketPhoto {
  ticketId: string;
  path: string;
}

export interface TicketHistory {
  id: string;
  ticketId: string;
  at: string;
  action: string;
}

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface Job {
  id: string;
  ticketId: string;
  partnerId: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  runAfter: string;
  createdAt: string;
  updatedAt: string;
}

export interface Partner {
  id: string;
  name: string;
  concurrency: number;
}
