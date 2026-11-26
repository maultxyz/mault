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
import {
  CARD_TAGS,
  cardTagNameKey,
  cardTagsSetOn,
  type CardTag,
} from "@magic-vault/shared";
import { IconCheck, IconChevronDown, IconSparkles } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function CardTagsMenu({
  scanId,
  isDownloaded,
  isReviewed,
  isAutoReviewed,
  wasCorrected,
  useSheet,
}: CardTagsMenuProps) {
  const { t } = useTranslation("cards");
  const { setCardTags } = useCardDetailActions();
  const [sheetOpen, setSheetOpen] = useState(false);
  const tagFlags = {
    isDownloaded,
    reviewed: isReviewed,
    autoReviewed: isAutoReviewed,
    corrected: wasCorrected,
  };
  const tagsSet = cardTagsSetOn(tagFlags);
  const setTagName = (tag: CardTag) =>
    t(`cardTags.names.${cardTagNameKey(tag, tagFlags)}`);
  const toggle = (tag: CardTag) =>
    setCardTags(scanId, [tag], !tagsSet.includes(tag));

  const triggerLabel =
    tagsSet.length === 0
      ? t("cardTags.edit")
      : t("cardTags.editWithTags", {
          tags: tagsSet.map(setTagName).join(", "),
        });
  const triggerContent = (
    <>
      {tagsSet.length === 0
        ? t("cardTags.title")
        : tagsSet.map((tag) =>
            tag === "reviewed" ? (
              <Badge key={tag} variant="success">
                {isAutoReviewed ? <IconSparkles /> : <IconCheck />}
                {setTagName(tag)}
              </Badge>
            ) : (
              <Badge key={tag} variant="secondary">
                {setTagName(tag)}
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
            label: setTagName(tag),
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
            {setTagName(tag)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
