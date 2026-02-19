<script setup lang="ts">
import { provide, ref, watch } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { ROLE_KEY, type Role } from "./role";

const role = ref<Role>((localStorage.getItem("role") as Role) || "operator");

watch(role, (r) => localStorage.setItem("role", r));

provide(ROLE_KEY, role);
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div style="display:flex; align-items:center;">
        <span class="topbar-brand">Recolour</span>
        <nav class="topbar-nav">
          <RouterLink class="nav-link" to="/">Queue</RouterLink>
          <RouterLink class="nav-link" to="/create">New Ticket</RouterLink>
          <RouterLink class="nav-link" to="/approved">Library</RouterLink>
          <RouterLink v-if="role === 'manager'" class="nav-link" to="/overview">Overview</RouterLink>
        </nav>
      </div>

      <div class="role-selector">
        Role:
        <select v-model="role">
          <option value="operator">operator</option>
          <option value="manager">manager</option>
        </select>
      </div>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>
