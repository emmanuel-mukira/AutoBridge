type Env = {
  VITE_API_URL?: string;
};

const env = import.meta.env as unknown as Env;

export const API_URL = env.VITE_API_URL ?? "";

if (import.meta.env.PROD && !API_URL) {
  console.error("[config] Missing VITE_API_URL for the deployed frontend");
}
