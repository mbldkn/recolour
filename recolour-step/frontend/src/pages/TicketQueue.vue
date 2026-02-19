<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { api, Ticket, Partner } from "../api";
import { inject, type Ref } from "vue";
import { ROLE_KEY, type Role } from "../role";

const role = inject(ROLE_KEY);
if (!role) throw new Error("ROLE_KEY not provided");

const tickets = ref<Ticket[]>([]);
const partners = ref<Partner[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const partnerName = computed(() => {
  const map = new Map(partners.value.map((p) => [p.id, p.name]));
  return (id: string) => map.get(id) ?? id;
});

type FilterMode = "actionable" | "all" | "send" | "approve" | "active";
const filterMode = ref<FilterMode>("all");

async function load() {
  loading.value = true;
  error.value = null;
  try {
    tickets.value = await api.tickets();
  } catch (e: any) {
    error.value = e?.message ?? "Failed to load tickets";
  } finally {
    loading.value = false;
  }
}

async function send(ticket: Ticket) {
  try {
    await api.action(ticket.id, "send_to_partner");
    await load();
  } catch (e: any) {
    error.value = e?.message ?? "Failed to send ticket";
  }
}

async function approve(ticket: Ticket) {
  try {
    await api.action(ticket.id, "approve");
    await load();
  } catch (e: any) {
    error.value = e?.message ?? "Failed to approve ticket";
  }
}

async function reject(ticket: Ticket) {
  try {
    await api.action(ticket.id, "reject");
    await load();
  } catch (e: any) {
    error.value = e?.message ?? "Failed to reject ticket";
  }
}

const canSend = (t: Ticket) =>
  role.value === "operator" && (t.status === "pending" || t.status === "rejected");

const canApproveReject = (t: Ticket) =>
  role.value === "manager" && t.status === "awaiting_approval";

const isActionable = (t: Ticket) =>
  canSend(t) || canApproveReject(t);

const filteredTickets = computed(() => {
  return tickets.value.filter((t) => {
    if (filterMode.value === "all") return true;
    if (filterMode.value === "actionable") return isActionable(t);
    if (filterMode.value === "send") return canSend(t);
    if (filterMode.value === "approve") return canApproveReject(t);
    if (filterMode.value === "active") return t.status === "queued" || t.status === "in_progress";
    return true;
  });
});

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "gray", queued: "blue", in_progress: "yellow",
    awaiting_approval: "purple", approved: "green", rejected: "red",
  };
  return map[status] ?? "gray";
}

function priorityBadge(p: string) {
  return p === "high" ? "red" : p === "medium" ? "orange" : "gray";
}

onMounted(async () => {
  partners.value = await api.partners().catch(() => []);
  await load();
});
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Ticket Queue</h1>
        <div class="page-subtitle">Role: <b>{{ role }}</b></div>
      </div>

      <div class="toolbar">
        <label>
          Show:
          <select v-model="filterMode">
            <option value="actionable">Actionable only</option>
            <option value="send">Needs send</option>
            <option value="approve">Needs approval</option>
            <option value="active">Active processing</option>
            <option value="all">All</option>
          </select>
        </label>
        <button class="btn" @click="load" :disabled="loading">Refresh</button>
      </div>
    </div>

    <div v-if="error" class="alert-error">{{ error }}</div>
    <p v-if="loading" class="loading-text">Loading…</p>

    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Partner</th>
            <th>Preview</th>
            <th style="width:220px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in filteredTickets" :key="t.id">
            <td><span class="mono">{{ t.id }}</span></td>
            <td><span :class="['badge', statusBadge(t.status)]">{{ t.status.replace('_', ' ') }}</span></td>
            <td><span :class="['badge', priorityBadge(t.priority)]">{{ t.priority }}</span></td>
            <td>{{ partnerName(t.partnerId) }}</td>

            <td>
              <div style="display:flex; gap:6px;">
                <img
                  v-if="t.photos?.length"
                  :src="t.photos[0]"
                  style="width:40px; height:40px; object-fit:cover; border-radius:4px; border:1px solid #e2e8f0;"
                />
                <img
                  v-if="t.referenceImagePath"
                  :src="t.referenceImagePath"
                  style="width:40px; height:40px; object-fit:cover; border-radius:4px; border:1px solid #e2e8f0;"
                />
              </div>
            </td>

            <td>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button v-if="canSend(t)" class="btn primary" @click="send(t)">Send</button>
                <button v-if="canApproveReject(t)" class="btn success" @click="approve(t)">Approve</button>
                <button v-if="canApproveReject(t)" class="btn danger" @click="reject(t)">Reject</button>
              </div>
            </td>
          </tr>

          <tr v-if="filteredTickets.length === 0">
            <td colspan="6" class="empty-state">No tickets match this filter.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
