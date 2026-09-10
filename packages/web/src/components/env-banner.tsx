import { ENV_BANNER_CONFIG as CONFIG } from "@/lib/constants/env-banner";

const ENV = import.meta.env.VITE_APP_ENV as string | undefined;

type KnownEnv = keyof typeof CONFIG;

function isKnownEnv(env: string | undefined): env is KnownEnv {
  return !!env && env in CONFIG;
}

export function EnvBanner({ className }: { className?: string }) {
  if (!isKnownEnv(ENV)) return null;
  const { label, className: colorClass } = CONFIG[ENV];

  return (
    <div
      className={`rounded-full px-2 py-0.5 text-center text-[11px] font-semibold tracking-widest uppercase select-none ${colorClass} ${className ?? ""}`}
    >
      {label} Environment
    </div>
  );
}
