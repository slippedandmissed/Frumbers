import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import postgres from "postgres";
import { config } from "../config";

const queryClient = postgres({
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  ssl: config.db.ssl,
  idle_timeout: 120,
});

export const db = drizzle(queryClient, { schema });
export type Transactable =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];
