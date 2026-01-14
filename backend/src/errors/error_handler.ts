import Elysia from "elysia";
import { HttpError } from "./http_error";

export const errorHandler = new Elysia({ name: "errorHandler" })
  .error({
    HttpError,
  })
  .onError({ as: "global" }, ({ code, error, set }) => {
    console.error(error);
    switch (code) {
      case "HttpError":
        set.status = error.statusCode;
        return error.message;
      case "VALIDATION":
        console.error(error);
        break;
      default:
        return;
    }
  });
