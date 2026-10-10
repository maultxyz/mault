import { API_BASE } from "@/lib/constants/api";
import {
  API_PLAYGROUND_SECURITY_SCHEME,
  API_PLAYGROUND_THEME_CSS,
  OPENAPI_SPEC_URL,
} from "@/lib/constants/api-playground";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { IconArrowLeft, IconKey } from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function ApiPlaygroundPage() {
  const { t } = useTranslation("integrations");
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === "dark";

  const configuration = useMemo(
    () => ({
      url: OPENAPI_SPEC_URL,
      servers: [
        {
          url: new URL(`${API_BASE}/api`, window.location.origin).toString(),
          description: t("playground.server"),
        },
      ],
      authentication: { preferredSecurityScheme: API_PLAYGROUND_SECURITY_SCHEME },
      persistAuth: false,
      theme: "default" as const,
      withDefaultFonts: false,
      customCss: API_PLAYGROUND_THEME_CSS,
      hideDarkModeToggle: true,
      forceDarkModeState: darkMode ? ("dark" as const) : ("light" as const),
      hideClientButton: true,
      showDeveloperTools: "never" as const,
      documentDownloadType: "json" as const,
      defaultHttpClient: { targetKey: "shell" as const, clientKey: "curl" as const },
      telemetry: false,
      mcp: { disabled: true },
      agent: { disabled: true },
    }),
    [darkMode, t],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
        <Link
          to={SETTINGS_PATHS.integrations}
          className="flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground"
        >
          <IconArrowLeft className="size-3.5" />
          {t("playground.back")}
        </Link>
        <Link
          to={SETTINGS_PATHS.integrations}
          className="flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground"
        >
          <IconKey className="size-3.5" />
          {t("playground.getKey")}
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ApiReferenceReact configuration={configuration} />
      </div>
    </div>
  );
}
