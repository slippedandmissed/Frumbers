import Elysia, { t } from "elysia";
import { getMotd } from "../core/motd";

export const motd = new Elysia({ prefix: "/motd" }).get(
  "/",
  () => {
    return getMotd();
  },
  {
    response: t.String(),
  },
);
