export const ENV_BANNER_CONFIG = {
  local: {
    label: "Local",
    className: "bg-pink-400/90 text-pink-950",
  },
  development: {
    label: "Development",
    className: "bg-amber-400/90 text-amber-950",
  },
  qa: {
    label: "QA",
    className: "bg-violet-500/90 text-violet-50",
  },
} satisfies Record<string, { label: string; className: string }>;
