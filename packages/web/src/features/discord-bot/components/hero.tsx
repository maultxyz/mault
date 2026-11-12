import { buttonVariants } from "@/components/ui/button";
import { neon } from "@/lib/auth/client";
import { DISCORD_BOT_INSTALL_URL } from "@/lib/constants/links";
import { cn } from "@/lib/utils";
import { IconBrandDiscord } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { SETTINGS_PATHS } from "@/lib/constants/settings";

export function DiscordBotHero() {
  const { t } = useTranslation("discordBot");
  const { data, isPending } = neon.auth.useSession();
  const isSignedIn = !isPending && !!data?.user;

  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-16 pb-16 text-center md:pt-24 md:pb-24">
      <p className="font-heading text-2xs font-medium tracking-widest text-primary uppercase">
        {t("hero.eyebrow")}
      </p>
      <h1 className="mt-6 max-w-4xl font-heading text-5xl leading-[1.02] font-semibold tracking-tight text-balance md:text-6xl">
        {t("hero.title")}
      </h1>
      <p className="mt-6 max-w-2xl text-base/relaxed text-balance text-foreground/70 md:text-lg/relaxed">
        {t("hero.description")}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-1.5">
        <a
          href={DISCORD_BOT_INSTALL_URL}
          target="_blank"
          rel="noreferrer"
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "gap-2",
          )}
        >
          <IconBrandDiscord className="size-4" />
          {t("hero.addToDiscord")}
        </a>
        <Link
          to={isSignedIn ? SETTINGS_PATHS.notifications : "/auth/sign-up"}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          {isSignedIn ? t("hero.openSettings") : t("hero.getStarted")}
        </Link>
        <a
          href="#setup"
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}
        >
          {t("hero.seeSetup")}
        </a>
      </div>

      <p className="mt-6 max-w-xl text-xs/relaxed text-balance text-foreground/70">
        {t("hero.selfHostedNote")}
      </p>
    </section>
  );
}
