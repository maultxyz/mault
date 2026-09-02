import { buttonVariants } from "@/components/ui/button";
import { neon } from "@/lib/auth/client";
import { DISCORD_BOT_INSTALL_URL } from "@/lib/links";
import { cn } from "@/lib/utils";
import { IconBrandDiscord } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function DiscordBotHero() {
  const { t } = useTranslation("discordBot");
  const { data, isPending } = neon.auth.useSession();
  const isSignedIn = !isPending && !!data?.user;

  return (
    <section className="mx-auto max-w-4xl px-4 pt-12 pb-16">
      <p className="text-xs font-semibold text-primary">
        {t("hero.eyebrow")}
      </p>
      <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl lg:text-5xl">
        {t("hero.title")}
      </h1>
      <p className="mt-4 max-w-2xl text-sm/relaxed text-muted-foreground md:text-base/relaxed">
        {t("hero.description")}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={DISCORD_BOT_INSTALL_URL}
          target="_blank"
          rel="noreferrer"
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "gap-2 shadow-sm shadow-primary/30 transition-shadow hover:shadow-md hover:shadow-primary/30",
          )}
        >
          <IconBrandDiscord className="size-4" />
          {t("hero.addToDiscord")}
        </a>
        <Link
          to={isSignedIn ? "/app/settings" : "/auth/sign-up"}
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

      <p className="mt-5 max-w-2xl text-xs/relaxed text-muted-foreground">
        {t("hero.selfHostedNote")}
      </p>
    </section>
  );
}
