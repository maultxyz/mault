import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconBrandDiscord } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDiscordBotSettings } from "../api/use-discord-bot";

interface PendingCode {
  code: string;
  expiresAt: number;
}

export function DiscordBotSettings() {
  const { t } = useTranslation("companies");
  const {
    isLinked,
    isLoading,
    generateCode,
    isGenerating,
    unlink,
    isUnlinking,
  } = useDiscordBotSettings();
  const [pending, setPending] = useState<PendingCode | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!pending) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [pending]);

  useEffect(() => {
    if (pending && now >= pending.expiresAt) setPending(null);
  }, [pending, now]);

  async function handleGenerate() {
    const result = await generateCode();
    if (result.data) {
      setPending({
        code: result.data.code,
        expiresAt: new Date(result.data.expiresAt).getTime(),
      });
    }
  }

  async function handleUnlink() {
    await unlink();
    setPending(null);
  }

  const secondsLeft = pending
    ? Math.max(0, Math.ceil((pending.expiresAt - now) / 1000))
    : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <IconBrandDiscord className="size-4" />
        <Label>{t("discordBot.heading")}</Label>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("discordBot.description")}
      </p>

      {isLinked ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <span className="text-sm">{t("discordBot.linked")}</span>
          <Button
            variant="outline-destructive"
            size="sm"
            onClick={handleUnlink}
            disabled={isUnlinking || isLoading}
          >
            {t("discordBot.unlink")}
          </Button>
        </div>
      ) : pending ? (
        <div className="flex flex-col gap-2 rounded-lg border px-3 py-2">
          <p className="text-sm text-muted-foreground">
            {t("discordBot.codeInstructions")}
          </p>
          <div className="flex items-center justify-between gap-2">
            <code className="text-lg font-mono font-semibold tracking-widest">
              {pending.code}
            </code>
            <span className="text-xs text-muted-foreground">
              {t("discordBot.expiresIn", { seconds: secondsLeft })}
            </span>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={handleGenerate}
          disabled={isGenerating || isLoading}
        >
          {isGenerating
            ? t("discordBot.generating")
            : t("discordBot.generateButton")}
        </Button>
      )}
    </div>
  );
}
