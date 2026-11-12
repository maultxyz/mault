import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCardDetailActions } from "@/features/cards/api/use-card-detail-scope";
import { CardDetailActionsSheet } from "@/features/cards/components/card-detail-actions-sheet";
import type { CardTagsMenuProps } from "@/lib/interfaces/cards";
import { CARD_TAGS, cardTagsSetOn, type CardTag } from "@magic-vault/shared";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function CardTagsMenu({
  scanId,
  isDownloaded,
  isReviewed,
  wasCorrected,
  useSheet,
}: CardTagsMenuProps) {
  const { t } = useTranslation("cards");
  const { setCardTags } = useCardDetailActions();
  const [sheetOpen, setSheetOpen] = useState(false);
  const tagsSet = cardTagsSetOn({
    isDownloaded,
    reviewed: isReviewed,
    corrected: wasCorrected,
  });
  const toggle = (tag: CardTag) =>
    setCardTags(scanId, [tag], !tagsSet.includes(tag));

  const triggerLabel =
    tagsSet.length === 0
      ? t("cardTags.edit")
      : t("cardTags.editWithTags", {
          tags: tagsSet.map((tag) => t(`cardTags.names.${tag}`)).join(", "),
        });
  const triggerContent = (
    <>
      {tagsSet.length === 0
        ? t("cardTags.title")
        : tagsSet.map((tag) =>
            tag === "reviewed" ? (
              <Badge key={tag} variant="success">
                <IconCheck />
                {t(`cardTags.names.${tag}`)}
              </Badge>
            ) : (
              <Badge key={tag} variant="secondary">
                {t(`cardTags.names.${tag}`)}
              </Badge>
            ),
          )}
      <IconChevronDown />
    </>
  );

  if (useSheet) {
    return (
      <>
        <Button
          variant="ghost"
          className="shrink-0"
          aria-label={triggerLabel}
          onClick={() => setSheetOpen(true)}
        >
          {triggerContent}
        </Button>
        <CardDetailActionsSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={t("cardTags.title")}
          actions={CARD_TAGS.map((tag) => ({
            key: tag,
            label: t(`cardTags.names.${tag}`),
            icon: tagsSet.includes(tag) ? <IconCheck /> : <span />,
            onSelect: () => toggle(tag),
          }))}
        />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="shrink-0"
            aria-label={triggerLabel}
          />
        }
      >
        {triggerContent}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {CARD_TAGS.map((tag) => (
          <DropdownMenuCheckboxItem
            key={tag}
            checked={tagsSet.includes(tag)}
            onCheckedChange={() => toggle(tag)}
          >
            {t(`cardTags.names.${tag}`)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
