// src/config.js (Vite-safe, Cloudflare-safe)

const clean = (v) => {
  if (v === undefined || v === null) return "";
  const s = String(v).trim();
  if (!s) return "";
  if (s.toLowerCase() === "undefined") return "";
  if (s.toLowerCase() === "null") return "";
  return s;
};

const viteApi = clean(import.meta?.env?.VITE_API_BASE);
const viteSocket = clean(import.meta?.env?.VITE_SOCKET_URL);

const origin =
  typeof window !== "undefined" && window.location ? window.location.origin : "";

export const API_BASE = (viteApi || origin).replace(/\/$/, "");
export const SOCKET_URL = (viteSocket || API_BASE).replace(/\/$/, "");
