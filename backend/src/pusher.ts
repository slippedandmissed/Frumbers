import Pusher from "pusher";
import { config } from "./config";

export const pusher = new Pusher({
  ...(config.pusher.type === "host"
    ? {
        host: config.pusher.host,
        port: config.pusher.port.toString(),
      }
    : {
        cluster: config.pusher.cluster,
      }),
  appId: config.pusher.appId,
  key: config.pusher.key,
  secret: config.pusher.secret,
});
