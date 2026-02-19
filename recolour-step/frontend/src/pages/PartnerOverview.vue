<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, PartnerOverviewRow } from "../api";

const rows = ref<PartnerOverviewRow[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    rows.value = await api.partnerOverview();
  } catch (e: any) {
    error.value = e?.message ?? "Failed to load overview";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Partner Overview</h1>
      <button class="btn" @click="load" :disabled="loading">Refresh</button>
    </div>

    <div v-if="error" class="alert-error">{{ error }}</div>
    <p v-if="loading" class="loading-text">Loading…</p>

    <div v-if="!loading" class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Partner</th>
            <th>Concurrency</th>
            <th>Total</th>
            <th>Pending</th>
            <th>Queued</th>
            <th>In progress</th>
            <th>Awaiting approval</th>
            <th>Approved</th>
            <th>Rejected</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.partnerId">
            <td>
              <div style="font-weight:600;">{{ r.partnerName }}</div>
              <div class="mono">{{ r.partnerId }}</div>
            </td>
            <td><span class="badge blue">{{ r.concurrency }}</span></td>
            <td style="font-weight:600;">{{ r.total }}</td>
            <td>{{ r.counts.pending ?? 0 }}</td>
            <td>
              <span v-if="r.counts.queued" class="badge blue">{{ r.counts.queued }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td>
              <span v-if="r.counts.in_progress" class="badge yellow">{{ r.counts.in_progress }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td>
              <span v-if="r.counts.awaiting_approval" class="badge purple">{{ r.counts.awaiting_approval }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td>
              <span v-if="r.counts.approved" class="badge green">{{ r.counts.approved }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td>
              <span v-if="r.counts.rejected" class="badge red">{{ r.counts.rejected }}</span>
              <span v-else class="text-muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
