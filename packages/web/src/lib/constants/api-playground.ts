export const API_PLAYGROUND_PATH = "/app/api-playground";
export const OPENAPI_SPEC_URL = "/openapi.json";
export const API_PLAYGROUND_SECURITY_SCHEME = "apiKey";

export const API_PLAYGROUND_THEME_CSS = `
.light-mode,
.dark-mode {
  --scalar-font: "Figtree Variable", sans-serif;
  --scalar-font-code: "Geist Mono Variable", ui-monospace, monospace;
  --scalar-radius: calc(var(--radius) - 4px);
  --scalar-radius-lg: calc(var(--radius) - 2px);
  --scalar-radius-xl: var(--radius);

  --scalar-background-1: var(--background);
  --scalar-background-2: var(--muted);
  --scalar-background-3: var(--accent);
  --scalar-background-accent: color-mix(in oklab, var(--primary) 12%, transparent);

  --scalar-color-1: var(--foreground);
  --scalar-color-2: color-mix(in oklab, var(--foreground) 80%, transparent);
  --scalar-color-3: color-mix(in oklab, var(--foreground) 70%, transparent);
  --scalar-color-accent: var(--primary);
  --scalar-border-color: var(--border);

  --scalar-color-green: var(--success-strong);
  --scalar-color-red: var(--destructive);
  --scalar-color-yellow: var(--warning-strong);
  --scalar-color-blue: var(--info);
  --scalar-color-orange: var(--warning);
  --scalar-color-purple: var(--primary);

  --scalar-button-1: var(--primary);
  --scalar-button-1-color: var(--primary-foreground);
  --scalar-button-1-hover: color-mix(in oklab, var(--primary) 85%, black);

  --scalar-sidebar-background-1: var(--background);
  --scalar-sidebar-color-1: var(--foreground);
  --scalar-sidebar-color-2: color-mix(in oklab, var(--foreground) 75%, transparent);
  --scalar-sidebar-border-color: var(--border);
  --scalar-sidebar-item-hover-background: var(--muted);
  --scalar-sidebar-item-hover-color: var(--foreground);
  --scalar-sidebar-item-active-background: var(--muted);
  --scalar-sidebar-color-active: var(--foreground);
  --scalar-sidebar-search-background: var(--muted);
  --scalar-sidebar-search-border-color: var(--border);
  --scalar-sidebar-search-color: color-mix(in oklab, var(--foreground) 70%, transparent);
}
`;
