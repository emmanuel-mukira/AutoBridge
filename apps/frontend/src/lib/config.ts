type Env = {
  VITE_API_URL?: string;
  VITE_APP_URL?: string;
};

const env = import.meta.env as unknown as Env;

export const API_URL = env.VITE_API_URL ?? "";
export const APP_URL = env.VITE_APP_URL ?? "";

if (import.meta.env.DEV) {
  if (!API_URL) console.error("[config] Missing VITE_API_URL");
  if (!APP_URL) console.error("[config] Missing VITE_APP_URL");
}
