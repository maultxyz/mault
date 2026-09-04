import { DEMO_COLLECTIONS } from "@/app/routes/landing/demo-collections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconEdit, IconPlus, IconShare } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function DemoCollectionSwitcher() {
  const { t } = useTranslation("collections");
  const [activeGuid, setActiveGuid] = useState(DEMO_COLLECTIONS[0].guid);
  const active =
    DEMO_COLLECTIONS.find((c) => c.guid === activeGuid) ?? DEMO_COLLECTIONS[0];

  return (
    <Field>
      <span className="flex items-center gap-1.5">
        <FieldLabel>{t("switcher.label")}</FieldLabel>
        <Badge variant="outline" className="shrink-0">
          {active.game}
        </Badge>
        <Badge variant="outline" className="shrink-0">
          {active.lang}
        </Badge>
      </span>
      <ButtonGroup className="w-full bg-background rounded-lg">
        <Select
          value={activeGuid}
          onValueChange={(guid) => guid && setActiveGuid(guid)}
        >
          <SelectTrigger className="flex-1 overflow-hidden">
            <SelectValue>
              <span className="truncate">{active.name}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DEMO_COLLECTIONS.map((c) => (
              <SelectItem key={c.guid} value={c.guid}>
                <span className="truncate">{c.name}</span>
                <span className="ml-auto pl-2 pr-6 pt-0.5 text-xs text-muted-foreground tabular-nums">
                  {c.cardCount}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="outline" size="icon">
                <IconEdit />
              </Button>
            }
          />
          <TooltipContent>{t("switcher.manageCollections")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="outline" size="icon">
                <IconShare />
              </Button>
            }
          />
          <TooltipContent>{t("switcher.copyMonitorLink")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="outline" size="icon">
                <IconPlus />
              </Button>
            }
          />
          <TooltipContent>{t("switcher.newCollection")}</TooltipContent>
        </Tooltip>
      </ButtonGroup>
    </Field>
  );
}
