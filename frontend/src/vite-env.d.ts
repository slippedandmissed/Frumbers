/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_SERVER_URL: string;
  VITE_PUSHER_HOST?: string;
  VITE_PUSHER_PORT?: string;
  VITE_PUSHER_CLUSTER?: string;
  VITE_PUSHER_KEY: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}
