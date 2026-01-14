import Pusher from "pusher-js";

export const createPusher = () => {
  return new Pusher(import.meta.env.VITE_PUSHER_KEY, {
    wsHost: import.meta.env.VITE_PUSHER_HOST,
    wsPort:
      import.meta.env.VITE_PUSHER_PORT === undefined
        ? undefined
        : +import.meta.env.VITE_PUSHER_PORT,
    disableStats: true,
    forceTLS: false,
    enabledTransports: ["ws", "wss"],
    cluster: import.meta.env.VITE_PUSHER_CLUSTER ?? "",
  });
};
