import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  intakeLotQueryOptions,
  intakeLotsQueryOptions,
} from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { BusinessUpgradeCallout } from "@/features/business/components/business-upgrade-callout";
import { IntakeCardDetail } from "@/features/business/components/intake-card-detail";
import { IntakeLotDetail } from "@/features/business/components/intake-lot-detail";
import { IntakeLotDialog } from "@/features/business/components/intake-lot-dialog";
import { IntakeLotList } from "@/features/business/components/intake-lot-list";
import { useServerPagedList } from "@/hooks/use-server-paged-list";
import {
  INTAKE_CARD_PARAM,
  INTAKE_LOT_PARAM,
  INTAKE_REVIEW_PARAM,
} from "@/lib/constants/business";
import { IconCash, IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export default function IntakePage() {
  const { t } = useTranslation("business");
  const { orgId, access } = useBusinessAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedParam = searchParams.get(INTAKE_LOT_PARAM);
  const {
    items: lots,
    pagination,
    isLoading,
  } = useServerPagedList(
    (request) => intakeLotsQueryOptions(orgId, request),
    selectedParam,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const selectedGuid = selectedParam ?? lots[0]?.guid;
  const openScanId = searchParams.get(INTAKE_CARD_PARAM);
  const isReviewing = searchParams.get(INTAKE_REVIEW_PARAM) === "1";
  const { data: selectedLot } = useQuery(intakeLotQueryOptions(selectedGuid));

  const select = (guid: string | null) =>
    setSearchParams(guid ? { [INTAKE_LOT_PARAM]: guid } : {}, {
      replace: true,
    });

  const openCard = (scanId: string, review = isReviewing) => {
    if (!selectedGuid) return;
    setSearchParams(
      {
        [INTAKE_LOT_PARAM]: selectedGuid,
        [INTAKE_CARD_PARAM]: scanId,
        ...(review ? { [INTAKE_REVIEW_PARAM]: "1" } : {}),
      },
      { replace: true },
    );
  };

  const closeCard = useCallback(() => {
    setSearchParams(selectedGuid ? { [INTAKE_LOT_PARAM]: selectedGuid } : {}, {
      replace: true,
    });
  }, [selectedGuid, setSearchParams]);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="grid flex-1 min-h-0 grid-cols-12 overflow-hidden">
        <section className="col-span-4 flex h-full flex-col gap-2 overflow-hidden border-r bg-sidebar/70 p-2 lg:col-span-3">
          <div className="px-1 pt-1">
            <h1 className="font-heading text-lg font-semibold">
              {t("intake.title")}
            </h1>
            <p className="text-xs text-foreground/70">
              {t("intake.subtitleList")}
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            disabled={access?.isLocked}
            onClick={() => setCreateOpen(true)}
          >
            <IconPlus />
            {t("intake.new")}
          </Button>
          <IntakeLotList
            lots={lots}
            pagination={pagination}
            selectedGuid={selectedGuid}
            isLoading={isLoading}
            onSelect={select}
          />
        </section>
        {selectedGuid && openScanId && selectedLot ? (
          <section className="col-span-8 flex min-h-0 flex-col overflow-hidden lg:col-span-9">
            <IntakeCardDetail
              lot={selectedLot}
              scanId={openScanId}
              reviewMode={isReviewing}
              onNavigate={(scanId) => openCard(scanId)}
              onClose={closeCard}
            />
          </section>
        ) : (
          <section className="col-span-8 flex max-h-full flex-col gap-4 overflow-y-auto p-4 lg:col-span-9">
            {access?.isLocked && <BusinessUpgradeCallout />}
            {selectedGuid ? (
              <IntakeLotDetail
                key={selectedGuid}
                guid={selectedGuid}
                onDeleted={() => select(null)}
                onOpenCard={openCard}
              />
            ) : (
              !isLoading && (
                <EmptyState
                  icon={IconCash}
                  title={t("intake.pickTitle")}
                  description={t("intake.pickDescription")}
                />
              )
            )}
          </section>
        )}
      </div>
      <IntakeLotDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(guid) => select(guid)}
      />
    </div>
  );
}
