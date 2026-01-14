import Elysia, { NotFoundError } from "elysia";
import { errorHandler } from "./errors/error_handler";
import { swagger } from "@elysiajs/swagger";
import packageJson from "../package.json" assert { type: "json" };
import api from "./api";

export const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: "Frumbers Backend API",
          version: packageJson.version,
        },
      },
    }),
  )
  .use(errorHandler)
  .use(api)
  .all("*", () => {
    throw new NotFoundError();
  });

export type App = typeof app;
