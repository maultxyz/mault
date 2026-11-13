import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { SortTestResult } from "@/features/bins/components/sort-test-result";
import { getRandomSampleCards } from "@/features/cards/api/card-search";
import { useCollections } from "@/features/collections/api/use-collections";
import type { SortTestButtonProps } from "@/lib/interfaces/bins";
import { toast } from "@/lib/toast";
import type { PlayingCard } from "@magic-vault/shared";
import { IconCards, IconRefresh, IconTestPipe } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function SortTestButton({ disabled }: SortTestButtonProps) {
  const { t } = useTranslation("bins");
  const { activeCollection } = useCollections();
  const { selectedSet } = useBinConfigs();
  const [isOpen, setIsOpen] = useState(false);
  const [card, setCard] = useState<PlayingCard | null>(null);
  const [drawCount, setDrawCount] = useState(0);
  const gameKey = activeCollection?.game?.key;
  const lang = activeCollection?.lang ?? "en";

  const draw = useMutation({
    mutationFn: () => getRandomSampleCards(gameKey ?? "", lang, 1),
    onSuccess: (result) => {
      if (result.success && result.data) {
        setCard(result.data[0] ?? null);
        setDrawCount((count) => count + 1);
        return;
      }
      toast.error(result.message || t("sortTest.loadFailed"));
    },
    onError: () => toast.error(t("sortTest.loadFailed")),
  });

  return (
    <>
      <Button
        variant="outline"
        className="w-full"
        disabled={disabled}
        onClick={() => {
          setIsOpen(true);
          if (gameKey) draw.mutate();
        }}
      >
        <IconTestPipe />
        {t("sortTest.button")}
      </Button>
      <DynamicDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        className="sm:max-w-2xl md:max-h-[85dvh]"
        title={t("sortTest.title")}
        description={t("sortTest.description", { name: selectedSet?.name })}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t("sortTest.close")}
            </Button>
            <Button
              disabled={!gameKey || draw.isPending}
              onClick={() => draw.mutate()}
            >
              <IconRefresh />
              {t("sortTest.nextCard")}
            </Button>
          </>
        }
        footerClassName="flex-col-reverse md:flex-row"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!gameKey ? (
            <EmptyState
              icon={IconCards}
              title={t("sortTest.noGameTitle")}
              description={t("sortTest.noGameDescription")}
            />
          ) : draw.isPending ? (
            <div className="flex gap-4">
              <Skeleton className="aspect-[2.5/3.5] w-36 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
          ) : !card ? (
            <EmptyState
              icon={IconCards}
              title={
                draw.isSuccess
                  ? t("sortTest.noCardsTitle")
                  : t("sortTest.loadFailed")
              }
              description={
                draw.isSuccess ? t("sortTest.noCardsDescription") : undefined
              }
            />
          ) : (
            <SortTestResult key={drawCount} card={card} isFoil={false} />
          )}
        </div>
      </DynamicDialog>
    </>
  );
}
