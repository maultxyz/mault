import { MarketingRule } from "@/components/marketing-rule";
import { OptionCard } from "@/components/option-card";
import { useSelfHostSetup } from "@/features/self-host/api/use-self-host-setup";
import {
  SELF_HOST_AUTH_OPTIONS,
  SELF_HOST_HOST_OPTIONS,
  SELF_HOST_SETUP_ANCHOR,
} from "@/lib/constants/self-host";
import type { SelfHostSetupStepProps } from "@/lib/interfaces/self-host";
import { useTranslation } from "react-i18next";

function SetupStep({ step, label, children }: SelfHostSetupStepProps) {
  return (
    <div className="group/step flex gap-3">
      <div className="flex flex-col items-center">
        <span className="grid size-6 shrink-0 place-items-center rounded-sm border border-primary font-heading text-2xs font-semibold text-primary">
          {String(step).padStart(2, "0")}
        </span>
        <span
          aria-hidden
          className="my-1.5 w-px flex-1 bg-border group-last/step:hidden"
        />
      </div>
      <div className="min-w-0 flex-1 pb-5 group-last/step:pb-0">
        <h3 className="font-heading text-sm font-semibold">{label}</h3>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

export function SelfHostSetup() {
  const { t } = useTranslation("selfhost");
  const { host, auth, updateSetup } = useSelfHostSetup();

  return (
    <section
      id={SELF_HOST_SETUP_ANCHOR}
      className="mx-auto max-w-4xl scroll-mt-14 px-4 py-10"
    >
      <div className="flex flex-col gap-4">
        <MarketingRule lead="01" label={t("setup.label")} />
        <div className="flex max-w-2xl flex-col gap-2">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            {t("setup.title")}
          </h2>
          <p className="text-sm/relaxed text-foreground/70">
            {t("setup.description")}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col">
        <SetupStep step={1} label={t("setup.host.label")}>
          <div
            role="radiogroup"
            aria-label={t("setup.host.label")}
            className="grid gap-2 sm:grid-cols-2"
          >
            {SELF_HOST_HOST_OPTIONS.map((option) => (
              <OptionCard
                key={option.value}
                icon={option.icon}
                title={t(`setup.host.${option.value}.title`)}
                description={t(`setup.host.${option.value}.description`)}
                selected={host === option.value}
                onSelect={() => updateSetup({ host: option.value })}
              />
            ))}
          </div>
        </SetupStep>
        <SetupStep step={2} label={t("setup.auth.label")}>
          <div
            role="radiogroup"
            aria-label={t("setup.auth.label")}
            className="grid gap-2 sm:grid-cols-2"
          >
            {SELF_HOST_AUTH_OPTIONS.map((option) => (
              <OptionCard
                key={option.value}
                icon={option.icon}
                title={t(`setup.auth.${option.value}.title`)}
                description={t(`setup.auth.${option.value}.description`)}
                selected={auth === option.value}
                onSelect={() => updateSetup({ auth: option.value })}
              />
            ))}
          </div>
        </SetupStep>
      </div>
    </section>
  );
}
