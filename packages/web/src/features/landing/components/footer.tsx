import { MarketingFooter } from "@/components/marketing-footer";
import { DISCORD_URL, DONATE_URL } from "@/lib/constants/links";
import { IconBrandDiscord, IconCoffee } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function LandingFooter() {
  const { t } = useTranslation("landing");
  const { t: tCommon } = useTranslation("common");

  return (
    <MarketingFooter
      wide
      links={[
        { label: t("nav.features"), href: "#features" },
        { label: t("nav.openSource"), href: "#open-source" },
        { label: t("nav.build"), to: "/build" },
        { label: t("nav.discordBot"), to: "/discord-bot" },
        { label: t("nav.signIn"), to: "/auth/sign-in" },
        { label: t("nav.privacy"), to: "/privacy" },
        { label: t("nav.terms"), to: "/terms" },
      ]}
      end={
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
          <a
            href={DONATE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={tCommon("footer.donateAriaLabel")}
            className="flex items-center gap-1 text-foreground/70 transition-colors hover:text-foreground"
          >
            <IconCoffee size={16} />
            {tCommon("footer.donate")}
          </a>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={t("nav.discordAriaLabel")}
            className="text-foreground/70 transition-colors hover:text-foreground"
          >
            <IconBrandDiscord size={18} />
          </a>
          <p className="text-sm text-foreground/70">
            {t("footer.copyright", {
              year: new Date().getFullYear(),
              version: __APP_VERSION__,
            })}
          </p>
        </div>
      }
    />
  );
}
