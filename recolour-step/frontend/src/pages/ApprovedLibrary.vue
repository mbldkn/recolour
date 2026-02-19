<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, Ticket } from "../api";

const items = ref<Ticket[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    items.value = await api.approvedLibrary();
  } catch (e: any) {
    error.value = e?.message ?? "Failed to load approved library";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Approved Library</h1>
      <button class="btn" @click="load" :disabled="loading">Refresh</button>
    </div>

    <div v-if="error" class="alert-error">{{ error }}</div>
    <p v-if="loading" class="loading-text">Loading…</p>

    <p v-if="!loading && items.length === 0" class="text-muted">No approved tickets yet.</p>

    <div v-if="items.length" class="card-grid">
      <div v-for="t in items" :key="t.id" class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:10px;">
          <div>
            <div style="font-weight:600; font-size:13px; margin-bottom:2px;">{{ t.photoSetId }}</div>
            <div class="mono">{{ t.id }}</div>
          </div>
          <span class="badge green">approved</span>
        </div>

        <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
          <span class="badge gray">{{ t.partnerId }}</span>
          <span :class="['badge', t.priority === 'high' ? 'red' : t.priority === 'medium' ? 'orange' : 'gray']">{{ t.priority }}</span>
        </div>

        <div v-if="t.referenceImagePath" style="display:flex; gap:10px; margin-bottom:12px;">
          <a v-if="t.referenceImagePath" :href="t.referenceImagePath" target="_blank" style="font-size:13px; color:#2563eb;">Reference ↗</a>
        </div>

        <div class="photo-strip">
          <img v-for="src in (t.photos ?? [])" :key="src" :src="src" />
        </div>
      </div>
    </div>
  </div>
</template>
