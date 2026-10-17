import type { WrappedStorySlide } from "@/lib/interfaces/cards";

export const WRAPPED_SLIDE_DURATION_MS = 5000;

export const WRAPPED_BLOB_POSITIONS = ["15% 15%", "85% 10%", "10% 95%", "90% 85%"];

export const WRAPPED_SLIDE_MESH: Record<WrappedStorySlide["type"], { base: string; colors: string[] }> = {
  intro: {
    base: "#2e1065",
    colors: ["#f0abfc", "#a855f7", "#4f46e5", "#e879f9"],
  },
  total: {
    base: "#172554",
    colors: ["#38bdf8", "#2563eb", "#4338ca", "#22d3ee"],
  },
  unique: {
    base: "#022c22",
    colors: ["#34d399", "#0d9488", "#0e7490", "#4ade80"],
  },
  set: {
    base: "#431407",
    colors: ["#fbbf24", "#ea580c", "#dc2626", "#fb923c"],
  },
  rarity: {
    base: "#4a0519",
    colors: ["#fb7185", "#db2777", "#a21caf", "#f9a8d4"],
  },
  color: {
    base: "#2e1065",
    colors: ["#c4b5fd", "#9333ea", "#a21caf", "#818cf8"],
  },
  mvp: {
    base: "#451a03",
    colors: ["#fde047", "#f59e0b", "#ea580c", "#fbbf24"],
  },
  value: {
    base: "#022c22",
    colors: ["#86efac", "#059669", "#0f766e", "#a3e635"],
  },
  speed: {
    base: "#450a0a",
    colors: ["#fca5a5", "#e11d48", "#ea580c", "#fbbf24"],
  },
};

export const WRAPPED_GRAIN_OVERLAY =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export const CARD_REVIEW_SEARCH_PARAM = "review";
