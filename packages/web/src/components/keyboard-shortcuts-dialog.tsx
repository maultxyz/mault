import { HotkeyHint } from "@/components/hotkey-hint";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useRole } from "@/hooks/use-role";
import { HOTKEY_GROUP_ORDER, HOTKEYS } from "@/lib/constants/hotkeys";
import type { HotkeyId } from "@/lib/interfaces/hotkeys";
import { IconKeyboard } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function KeyboardShortcutsButton() {
  const { t } = useTranslation("common");
  const { isAdmin } = useRole();
  const [open, setOpen] = useState(false);

  useHotkeys({ showShortcuts: () => setOpen(true) });

  const ids = (Object.keys(HOTKEYS) as HotkeyId[]).filter(
    (id) => isAdmin || id !== "goAdmin",
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-foreground/70 hover:text-foreground transition-colors"
      >
        <IconKeyboard size={14} />
        {t("hotkeys.footer")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("hotkeys.title")}</DialogTitle>
            <DialogDescription>{t("hotkeys.description")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
            {HOTKEY_GROUP_ORDER.map((group) => (
              <section key={group} className="flex flex-col gap-1.5">
                <h3 className="text-xs font-semibold text-foreground">
                  {t(`hotkeys.groups.${group}`)}
                </h3>
                <ul className="flex flex-col gap-1">
                  {ids
                    .filter((id) => HOTKEYS[id].group === group)
                    .map((id) => (
                      <li
                        key={id}
                        className="flex items-center justify-between gap-4 text-foreground/70"
                      >
                        <span>{t(`hotkeys.actions.${id}`)}</span>
                        <HotkeyHint id={id} />
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
