import "@fontsource-variable/figtree";
import "@fontsource-variable/geist-mono";
import { createApiReference } from "@scalar/api-reference";
import "@scalar/api-reference/style.css";
import "./theme.css";
import {
  API_BASE_URL,
  API_SECURITY_SCHEME,
  OPENAPI_SPEC_URL,
  PAGE_TITLE,
} from "./constants";

createApiReference("#app", {
  url: OPENAPI_SPEC_URL,
  servers: [{ url: API_BASE_URL, description: "Mault" }],
  authentication: { preferredSecurityScheme: API_SECURITY_SCHEME },
  persistAuth: false,
  theme: "default",
  withDefaultFonts: false,
  darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
  hideClientButton: true,
  showDeveloperTools: "never",
  documentDownloadType: "json",
  defaultHttpClient: { targetKey: "shell", clientKey: "curl" },
  telemetry: false,
  mcp: { disabled: true },
  agent: { disabled: true },
  metaData: { title: PAGE_TITLE },
});
