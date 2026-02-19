import type { InjectionKey, Ref } from "vue";

export type Role = "operator" | "manager";

export const ROLE_KEY: InjectionKey<Ref<Role>> = Symbol("role");
