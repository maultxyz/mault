import { GuideSectionHeader } from "@/components/guide/guide-section-header";
import { GuideSetupStep } from "@/components/guide/guide-setup-step";
import { OptionCard } from "@/components/option-card";
import { useSelfHostSetup } from "@/features/self-host/api/use-self-host-setup";
import {
  SELF_HOST_AUTH_OPTIONS,
  SELF_HOST_HOST_OPTIONS,
  SELF_HOST_SETUP_ANCHOR,
} from "@/lib/constants/self-host";
import { useTranslation } from "react-i18next";

export function SelfHostSetup() {
  const { t } = useTranslation("selfhost");
  const { host, auth, updateSetup } = useSelfHostSetup();

  return (
    <section
      id={SELF_HOST_SETUP_ANCHOR}
      className="mx-auto max-w-4xl scroll-mt-14 px-4 py-10"
    >
      <GuideSectionHeader
        id={SELF_HOST_SETUP_ANCHOR}
        step="01"
        eyebrow={t("setup.label")}
        heading={t("setup.title")}
      >
        <p className="text-sm/relaxed text-foreground/70">
          {t("setup.description")}
        </p>
      </GuideSectionHeader>

      <div className="mt-6 flex flex-col">
        <GuideSetupStep step={1} label={t("setup.host.label")}>
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
        </GuideSetupStep>
        <GuideSetupStep step={2} label={t("setup.auth.label")}>
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
        </GuideSetupStep>
      </div>
    </section>
  );
}
