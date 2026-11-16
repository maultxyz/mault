import { HotkeyHint } from "@/components/hotkey-hint";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useRole } from "@/hooks/use-role";
import {
  HOTKEY_GROUP_ORDER,
  HOTKEYS,
} from "@/lib/constants/hotkeys";
import { isHotkeyActive } from "@/lib/hotkeys";
import type { HotkeyId } from "@/lib/interfaces/hotkeys";
import {
  setSingleKeyHotkeysEnabled,
  useSingleKeyHotkeysEnabled,
} from "@/lib/single-key-hotkeys-store";
import { IconKeyboard } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

export function KeyboardShortcutsButton() {
  const { t } = useTranslation("common");
  const { isStaff } = useRole();
  const [open, setOpen] = useState(false);
  const singleKeyHotkeysEnabled = useSingleKeyHotkeysEnabled();
  const singleKeyHintId = useId();

  useHotkeys({ showShortcuts: () => setOpen(true) });

  const ids = (Object.keys(HOTKEYS) as HotkeyId[]).filter(
    (id) => isStaff || id !== "goAdmin",
  );
  const groups = HOTKEY_GROUP_ORDER.filter((group) =>
    ids.some((id) => HOTKEYS[id].group === group),
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
          <div className="flex flex-col gap-1">
            <Label className="flex items-center justify-between gap-4 font-normal">
              {t("hotkeys.singleKey.label")}
              <Switch
                checked={singleKeyHotkeysEnabled}
                onCheckedChange={setSingleKeyHotkeysEnabled}
                aria-describedby={singleKeyHintId}
              />
            </Label>
            <p id={singleKeyHintId} className="text-xs text-foreground/70">
              {t("hotkeys.singleKey.hint")}
            </p>
          </div>
          <div className="flex flex-col gap-4 md:gap-2 max-h-[60vh] overflow-y-auto">
            {groups.map((group) => (
              <section key={group} className="flex flex-col gap-1.5">
                <h3 className="text-xs font-semibold text-foreground">
                  {t(`hotkeys.groups.${group}`)}
                </h3>
                <ul className="flex flex-col gap-1">
                  {ids
                    .filter((id) => HOTKEYS[id].group === group)
                    .map((id) => {
                      const isActive = isHotkeyActive(
                        id,
                        singleKeyHotkeysEnabled,
                      );
                      return (
                        <li
                          key={id}
                          className="flex items-center justify-between gap-4 text-foreground/70"
                        >
                          <span>{t(`hotkeys.actions.${id}`)}</span>
                          <span className="inline-flex items-center gap-1.5">
                            {isActive ? null : (
                              <Badge variant="outline">{t("hotkeys.off")}</Badge>
                            )}
                            <HotkeyHint
                              id={id}
                              showWhenInactive
                              className={isActive ? undefined : "line-through"}
                            />
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
