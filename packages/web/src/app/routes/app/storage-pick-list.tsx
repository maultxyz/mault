import { DeleteDialog } from "@/components/delete-dialog";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrg } from "@/features/companies/api/use-organization";
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import { useStoragePickList } from "@/features/storage/api/use-storage-pick-list";
import { ScanCardsPanel } from "@/features/storage/components/scan-cards-panel";
import { StoragePickListForm } from "@/features/storage/components/storage-pick-list-form";
import { StoragePickListSheet } from "@/features/storage/components/storage-pick-list-sheet";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  MOBILE_NAV_SCROLL_PADDING_CLASS,
  MOBILE_PAGE_BODY_CLASS,
} from "@/lib/constants/nav";
import { STORAGE_PATH } from "@/lib/constants/storage";
import { cn } from "@/lib/utils";
import {
  IconBoxOff,
  IconCamera,
  IconCameraOff,
  IconDots,
  IconEdit,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function StoragePickListView() {
  const { t } = useTranslation("storage");
  const isMobile = useIsMobile();
  const pickList = useStoragePickList();
  const { isLocked } = useStorageAccess();
  const [isEditing, setIsEditing] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const hasList = pickList.entries.length > 0;
  const showForm = !hasList || isEditing;
  const allPicked = pickList.pickedCount >= pickList.cards.length;
  const showScanPanel = isScanOpen && !showForm && !allPicked;
  const description = t("pickList.description");
  const actions = !showForm && (
    <div className="flex gap-1.5">
      <Button
        variant={showScanPanel ? "outline-selected" : "default"}
        disabled={!showScanPanel && allPicked}
        onClick={() => setIsScanOpen(!showScanPanel)}
      >
        {showScanPanel ? <IconCameraOff /> : <IconCamera />}
        {showScanPanel ? t("pickList.scan.stop") : t("pickList.scan.button")}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label={t("pickList.moreActions")}
              title={t("pickList.moreActions")}
            />
          }
        >
          <IconDots />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <IconEdit />
            {t("pickList.editList")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={pickList.clear}>
            <IconX />
            {t("pickList.clear")}
          </DropdownMenuItem>
          {!isLocked && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={pickList.pickedCount === 0 || pickList.isFinishing}
                onClick={() => setFinishOpen(true)}
              >
                <IconBoxOff />
                {t("pickList.finish")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const body = showForm ? (
    <StoragePickListForm
      initialDecklist={pickList.decklist}
      onSubmit={(decklist) => {
        pickList.setDecklist(decklist);
        setIsEditing(false);
      }}
      onCancel={hasList ? () => setIsEditing(false) : undefined}
    />
  ) : showScanPanel ? (
    <div className="flex flex-col gap-4 md:gap-2 md:grid md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:items-start">
      <div className="sticky top-0 z-10 md:top-24">
        <ScanCardsPanel
          mode="pick"
          source={{
            cards: pickList.cards,
            checkedScanIds: pickList.pickedScanIds,
            setChecked: pickList.setPicked,
          }}
        />
      </div>
      <StoragePickListSheet pickList={pickList} />
    </div>
  ) : (
    <StoragePickListSheet pickList={pickList} />
  );

  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto",
        MOBILE_NAV_SCROLL_PADDING_CLASS,
      )}
    >
      {isMobile ? (
        <MobilePageHeader
          title={t("pickList.title")}
          subtitle={description}
          backTo={STORAGE_PATH}
        >
          {actions}
        </MobilePageHeader>
      ) : (
        <PageHeader
          title={t("pickList.title")}
          description={description}
          backTo={STORAGE_PATH}
          backLabel={t("pickList.back")}
          actions={actions}
        />
      )}
      <div
        className={
          isMobile
            ? MOBILE_PAGE_BODY_CLASS
            : cn(
                "mx-auto flex w-full flex-col gap-4 p-4 md:px-3 md:py-2",
                showScanPanel ? "max-w-6xl" : "max-w-4xl",
              )
        }
      >
        {body}
      </div>
      <DeleteDialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        title={t("pickList.finishTitle", { count: pickList.pickedCount })}
        description={t("pickList.finishDescription")}
        confirmLabel={t("pickList.finishConfirm")}
        onConfirm={pickList.finish}
      />
    </div>
  );
}

export default function StoragePickListPage() {
  const { activeOrg } = useOrg();
  return <StoragePickListView key={activeOrg?.id ?? ""} />;
}
