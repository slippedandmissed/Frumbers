import { config } from "./config";
import { app } from "./app";
import cors from "@elysiajs/cors";
import { PLAYER_ID_HEADER, PLAYER_PIN_HEADER } from "./core/player";

app
  .use(
    cors({
      origin: config.server.allowedCorsOrigins,
      allowedHeaders: ["Content-Type", PLAYER_ID_HEADER, PLAYER_PIN_HEADER],
    }),
  )
  .listen(config.server.port, () => {
    console.log(`Server running on port ${config.server.port}`);
  });
