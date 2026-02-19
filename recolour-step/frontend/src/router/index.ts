import { createRouter, createWebHistory } from "vue-router";
import TicketQueue from "../pages/TicketQueue.vue";
import CreateTicket from "../pages/CreateTicket.vue";
import ApprovedLibrary from "../pages/ApprovedLibrary.vue";
import PartnerOverview from "../pages/PartnerOverview.vue";

const routes = [
  { path: "/", name: "queue", component: TicketQueue },
  { path: "/create", name: "create", component: CreateTicket },
  { path: "/approved", name: "approved", component: ApprovedLibrary },
  { path: "/overview", name: "overview", component: PartnerOverview }
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
