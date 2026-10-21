import { Button } from "@/components/ui/button";
import { useDiscordAccount } from "@/features/account/api/use-discord-account";
import type { PendingDiscordLinkCode } from "@/lib/interfaces/integrations";
import {
  DISCORD_ACCOUNT_LINK_POLL_MS,
  LIVE_CLOCK_TICK_MS,
} from "@/lib/constants/timing";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function DiscordAccountLink() {
  const { t } = useTranslation("account");
  const {
    link,
    isLoading,
    refresh,
    generateCode,
    isGenerating,
    unlink,
    isUnlinking,
  } = useDiscordAccount();
  const [pending, setPending] = useState<PendingDiscordLinkCode | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!pending) return;
    const interval = setInterval(() => setNow(Date.now()), LIVE_CLOCK_TICK_MS);
    return () => clearInterval(interval);
  }, [pending]);

  useEffect(() => {
    if (!pending) return;
    const interval = setInterval(refresh, DISCORD_ACCOUNT_LINK_POLL_MS);
    return () => clearInterval(interval);
  }, [pending, refresh]);

  useEffect(() => {
    if (pending && (now >= pending.expiresAt || link)) setPending(null);
  }, [pending, now, link]);

  async function handleGenerate() {
    const result = await generateCode();
    if (result.data) {
      setPending({
        code: result.data.code,
        expiresAt: new Date(result.data.expiresAt).getTime(),
      });
    }
  }

  const secondsLeft = pending
    ? Math.max(0, Math.ceil((pending.expiresAt - now) / 1000))
    : 0;

  if (link) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">
          {link.discordUsername
            ? t("discord.linkedAs", { username: link.discordUsername })
            : t("discord.linked")}
        </span>
        <Button
          variant="outline-destructive"
          size="sm"
          onClick={() => void unlink()}
          disabled={isUnlinking}
        >
          {t("discord.unlink")}
        </Button>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="flex flex-col gap-2 rounded-lg bg-muted px-3 py-2">
        <p className="text-xs text-foreground/70">
          {t("discord.codeInstructions")}
        </p>
        <div className="flex items-center justify-between gap-2">
          <code className="font-mono text-lg font-semibold tracking-widest">
            {pending.code}
          </code>
          <span className="text-xs text-foreground/70">
            {t("discord.expiresIn", { seconds: secondsLeft })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleGenerate}
      disabled={isGenerating || isLoading}
    >
      {isGenerating ? t("discord.generating") : t("discord.generate")}
    </Button>
  );
}
