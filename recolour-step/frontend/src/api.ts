const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

export type Photoset = {
  id: string;
  name: string;
  referenceImage: string | null;
  productPhotos: string[];
};

export type Ticket = {
  id: string;
  photoSetId: string;
  priority: "low" | "medium" | "high";
  partnerId: string;
  status:
  | "pending"
  | "queued"
  | "in_progress"
  | "awaiting_approval"
  | "approved"
  | "rejected";
  referenceImagePath?: string | null;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
};

export type Partner = { id: string; name: string; concurrency: number };

export type PartnerOverviewRow = {
  partnerId: string;
  partnerName: string;
  concurrency: number;
  total: number;
  counts: Record<string, number>;
};

async function j<T>(resPromise: Promise<Response>): Promise<T> {
  const res = await resPromise;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

function roleHeaders(extra?: Record<string, string>) {
  const role = localStorage.getItem("role") ?? "operator";
  return { "X-Role": role, ...(extra ?? {}) };
}

export const api = {
  photosets: () => j<Photoset[]>(fetch(`${API_BASE}/api/photosets`, { headers: roleHeaders() })),
  partners: () => j<Partner[]>(fetch(`${API_BASE}/api/partners`, { headers: roleHeaders() })),
  tickets: (q?: { status?: string; partnerId?: string; priority?: string }) => {
    const params = new URLSearchParams();
    if (q?.status) params.set("status", q.status);
    if (q?.partnerId) params.set("partnerId", q.partnerId);
    if (q?.priority) params.set("priority", q.priority);
    const qs = params.toString();
    return j<Ticket[]>(fetch(`${API_BASE}/api/tickets${qs ? `?${qs}` : ""}`, { headers: roleHeaders() }));
  },
  createTicket: (body: { photoSetId: string; priority: string; partnerId: string }) =>
    j<Ticket>(fetch(`${API_BASE}/api/tickets`, { method: "POST", headers: roleHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(body) })),
  action: (ticketId: string, action: string) =>
    j<{ ok: boolean }>(fetch(`${API_BASE}/api/tickets/${ticketId}/action`, { method: "POST", headers: roleHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ action }) })),
  approvedLibrary: () => j<Ticket[]>(fetch(`${API_BASE}/api/library/approved`, { headers: roleHeaders() })),
  partnerOverview: () => j<PartnerOverviewRow[]>(fetch(`${API_BASE}/api/overview/partners`, { headers: roleHeaders() }))
};
