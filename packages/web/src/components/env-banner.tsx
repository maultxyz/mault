import { APP_ENV, ENV_BANNER_CONFIG as CONFIG } from "@/lib/constants/env-banner";
import type { KnownEnv } from "@/lib/interfaces/env-banner";

function isKnownEnv(env: string | undefined): env is KnownEnv {
  return !!env && env in CONFIG;
}

export function EnvBanner({ className }: { className?: string }) {
  if (!isKnownEnv(APP_ENV)) return null;
  const { label, className: colorClass } = CONFIG[APP_ENV];

  return (
    <div
      className={`rounded-full px-2 py-0.5 text-center text-xs font-semibold tracking-widest uppercase select-none ${colorClass} ${className ?? ""}`}
    >
      {label} Environment
    </div>
  );
}
