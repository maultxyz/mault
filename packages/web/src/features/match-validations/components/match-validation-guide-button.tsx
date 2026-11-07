import { HotkeyHint } from "@/components/hotkey-hint";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  hasSeenMatchValidationGuide,
  markMatchValidationGuideSeen,
} from "@/features/match-validations/lib/match-validation-guide";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { HOTKEY_PRIORITY_OVERRIDE } from "@/lib/constants/hotkeys";
import { MATCH_VALIDATION_GUIDE_ITEMS } from "@/lib/constants/match-validations";
import { IconHelpCircle } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function MatchValidationGuideButton() {
  const { t } = useTranslation("matchValidations");
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(() => !hasSeenMatchValidationGuide());

  const changeOpen = (open: boolean) => {
    if (!open) markMatchValidationGuideSeen();
    setIsOpen(open);
  };

  useHotkeys(
    Object.fromEntries(
      MATCH_VALIDATION_GUIDE_ITEMS.map(({ hotkey }) => [hotkey, () => {}]),
    ),
    isOpen,
    HOTKEY_PRIORITY_OVERRIDE,
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={t("guide.open")}
              variant="outline"
              size="icon"
              onClick={() => setIsOpen(true)}
            >
              <IconHelpCircle />
            </Button>
          }
        />
        <TooltipContent>{t("guide.open")}</TooltipContent>
      </Tooltip>
      <Dialog open={isOpen} onOpenChange={changeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("guide.title")}</DialogTitle>
            <DialogDescription>{t("guide.intro")}</DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-3">
            {MATCH_VALIDATION_GUIDE_ITEMS.map(({ key, icon: Icon, hotkey }) => (
              <li key={key} className="flex gap-2.5">
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t(`actions.${key}`)}</span>
                    {!isMobile && <HotkeyHint id={hotkey} />}
                  </div>
                  <p className="text-foreground/70">
                    {t(`guide.items.${key}`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button onClick={() => changeOpen(false)}>{t("guide.done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
