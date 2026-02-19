<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api, Photoset, Partner } from "../api";
import { useRouter } from "vue-router";

const router = useRouter();

const photosets = ref<Photoset[]>([]);
const partners = ref<Partner[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const photoSetId = ref<string>("");
const partnerId = ref<string>("");
const priority = ref<"low" | "medium" | "high">("medium");

onMounted(async () => {
  try {
    loading.value = true;
    photosets.value = await api.photosets();
    partners.value = await api.partners();

    if (photosets.value.length) photoSetId.value = photosets.value[0].id;
    if (partners.value.length) partnerId.value = partners.value[0].id;
  } catch (e: any) {
    error.value = e?.message ?? "Failed to load data";
  } finally {
    loading.value = false;
  }
});

async function create() {
  error.value = null;
  if (!photoSetId.value || !partnerId.value) {
    error.value = "Please select a photoset and a partner.";
    return;
  }

  try {
    loading.value = true;
    await api.createTicket({
      photoSetId: photoSetId.value,
      partnerId: partnerId.value,
      priority: priority.value,
    });

    router.push({ name: "queue" });
  } catch (e: any) {
    error.value = e?.message ?? "Failed to create ticket";
  } finally {
    loading.value = false;
  }
}

const selectedSet = computed(() => photosets.value.find((p) => p.id === photoSetId.value));
</script>

<template>
  <div class="page" style="max-width: 900px;">
    <div class="page-header">
      <h1 class="page-title">New Ticket</h1>
    </div>

    <div v-if="error" class="alert-error">{{ error }}</div>
    <p v-if="loading" class="loading-text">Loading…</p>

    <div v-if="!loading" style="display:grid; grid-template-columns: 300px 1fr; gap: 24px; align-items: start;">
      <div class="card">
        <div class="form">
          <div class="field">
            <label>Photoset</label>
            <select v-model="photoSetId">
              <option v-for="p in photosets" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>

          <div class="field">
            <label>Partner</label>
            <select v-model="partnerId">
              <option v-for="p in partners" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>

          <div class="field">
            <label>Priority</label>
            <select v-model="priority">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <button class="btn primary" style="margin-top: 4px;" @click="create" :disabled="loading">
            Create Ticket
          </button>
        </div>
      </div>

      <div v-if="selectedSet" class="preview-section" style="margin-top: 0;">
        <h3>Preview — {{ selectedSet.name }}</h3>

        <div v-if="selectedSet.referenceImage" style="margin-bottom: 16px;">
          <p class="text-muted" style="margin-bottom: 6px;">Reference image</p>
          <img :src="selectedSet.referenceImage" style="max-width: 220px; border-radius: 6px; border: 1px solid #e2e8f0;" />
        </div>

        <div>
          <p class="text-muted" style="margin-bottom: 6px;">Product photos ({{ selectedSet.productPhotos.length }})</p>
          <div class="photo-strip">
            <img v-for="src in selectedSet.productPhotos" :key="src" :src="src" />
          </div>
        </div>
      </div>

      <div v-else class="preview-section" style="margin-top:0; display:flex; align-items:center; justify-content:center; min-height:160px;">
        <p class="text-muted">Select a photoset to preview</p>
      </div>
    </div>
  </div>
</template>
