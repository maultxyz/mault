import { APP_ENV, ENV_BANNER_CONFIG } from "@/lib/constants/env-banner";
import type { KnownEnv } from "@/lib/interfaces/env-banner";
import { useTranslation } from "react-i18next";

function isKnownEnv(env: string | undefined): env is KnownEnv {
  return !!env && env in ENV_BANNER_CONFIG;
}

export function EnvBanner({ className }: { className?: string }) {
  const { t } = useTranslation();
  if (!isKnownEnv(APP_ENV)) return null;

  return (
    <div
      className={`rounded-full px-2 py-0.5 text-center text-xs font-semibold tracking-widest uppercase select-none ${ENV_BANNER_CONFIG[APP_ENV]} ${className ?? ""}`}
    >
      {t(`envBanner.${APP_ENV}`)}
    </div>
  );
}
