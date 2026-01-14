import { edenTreaty } from "@elysiajs/eden";
import type { App } from "frumbers-backend/src/app";

// @ts-expect-error Elysia is weird like that
const app = edenTreaty<App>(import.meta.env.VITE_SERVER_URL);

export const api = app.api;
