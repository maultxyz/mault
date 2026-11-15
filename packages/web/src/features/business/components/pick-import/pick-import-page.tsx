import { Callout } from "@/components/callout";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { createOrder } from "@/features/business/api/business";
import {
  useBusinessAccess,
  useBusinessAction,
} from "@/features/business/api/use-business";
import { BusinessUpgradeCallout } from "@/features/business/components/business-upgrade-callout";
import { PickImportColumns } from "@/features/business/components/pick-import/pick-import-columns";
import { PickImportReview } from "@/features/business/components/pick-import/pick-import-review";
import { PickImportSource } from "@/features/business/components/pick-import/pick-import-source";
import { PickImportSteps } from "@/features/business/components/pick-import/pick-import-steps";
import {
  applyPickImportOrderNames,
  buildPickImportRequests,
} from "@/features/business/lib/pick-import";
import { useCsvImport } from "@/hooks/use-csv-import";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  PICK_IMPORT_DEFAULT_VALUES,
  PICK_IMPORT_STEPS,
  PICKS_PATH,
  picksPath,
} from "@/lib/constants/business";
import {
  MOBILE_NAV_SCROLL_PADDING_CLASS,
  MOBILE_PAGE_BODY_CLASS,
} from "@/lib/constants/nav";
import type { CardListFile } from "@/lib/interfaces/card-list-import";
import type { PickImportStep } from "@/lib/interfaces/business";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  pickImportSchema,
  type PickImportFormValues,
} from "@/schemas/business.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  composeCsvOrders,
  detectSource,
  parseDecklist,
  type FulfilmentOrderInput,
  type OrderLineInput,
} from "@magic-vault/shared";
import {
  IconArrowLeft,
  IconArrowRight,
  IconLoader2,
  IconPackageImport,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function PickImportPage() {
  const { t } = useTranslation("csvImport");
  const { t: tBusiness } = useTranslation("business");
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { access } = useBusinessAccess();
  const run = useBusinessAction();
  const form = useForm<PickImportFormValues>({
    resolver: zodResolver(pickImportSchema),
    defaultValues: PICK_IMPORT_DEFAULT_VALUES,
  });
  const text = useWatch({ control: form.control, name: "text" }) ?? "";
  const createMode = useWatch({ control: form.control, name: "createMode" });
  const pickName = useWatch({ control: form.control, name: "pickName" });
  const orderNames = useWatch({ control: form.control, name: "orderNames" });
  const csvImport = useCsvImport({ type: "orders", text, enabled: true });
  const { table, isTabular, mapping } = csvImport;
  const [step, setStep] = useState<PickImportStep>("source");
  const [createdGuid, setCreatedGuid] = useState<string | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const hasChangedStepRef = useRef(false);

  const composed = useMemo(
    () => (mapping && isTabular ? composeCsvOrders(table.rows, mapping) : null),
    [mapping, isTabular, table.rows],
  );
  const plainListLines = useMemo<OrderLineInput[]>(
    () =>
      isTabular || !text.trim()
        ? []
        : parseDecklist(text).map((entry) => ({
            name: entry.name,
            quantity: entry.quantity,
          })),
    [isTabular, text],
  );
  const rawOrders = useMemo(() => composed?.orders ?? [], [composed]);

  useEffect(() => {
    form.setValue("orderNames", []);
  }, [rawOrders, form]);

  useEffect(() => {
    if (!hasChangedStepRef.current) return;
    stepHeadingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (createdGuid) void navigate(picksPath(createdGuid));
  }, [createdGuid, navigate]);

  const steps: PickImportStep[] = isTabular
    ? [...PICK_IMPORT_STEPS]
    : PICK_IMPORT_STEPS.filter((candidate) => candidate !== "columns");
  const stepIndex = steps.indexOf(step);
  const goTo = (next: PickImportStep) => {
    hasChangedStepRef.current = true;
    setStep(next);
  };

  const requests: FulfilmentOrderInput[] = mapping
    ? buildPickImportRequests({
        orders: applyPickImportOrderNames(rawOrders, orderNames),
        composition: mapping.composition,
        createMode,
        pickName,
        source: detectSource(table.headers.map((header) => header.toLowerCase())),
        fallbackName: (index) =>
          tBusiness("orders.importedName", { index: index + 1 }),
        batchName: (count) => tBusiness("orders.batchName", { count }),
      })
    : plainListLines.length > 0
      ? [
          {
            name:
              pickName.trim() || tBusiness("orders.importedName", { index: 1 }),
            source: "generic",
            lines: plainListLines,
          },
        ]
      : [];

  const canLeaveSource = isTabular ? mapping !== null : plainListLines.length > 0;
  const canLeaveColumns =
    csvImport.missingFields.length === 0 && rawOrders.length > 0;
  const canCreate =
    requests.length > 0 &&
    !access?.isLocked &&
    (access?.canFulfilOrders ?? false);
  const canGoNext = step === "source" ? canLeaveSource : canLeaveColumns;

  const readFile = ({ text: fileText }: CardListFile) =>
    form.setValue("text", fileText, { shouldDirty: true });

  const submit = form.handleSubmit(async () => {
    let lastGuid: string | null = null;
    let created = 0;
    for (const request of requests) {
      const result = await run(() => createOrder(request));
      if (!result?.data) break;
      lastGuid = result.data.guid;
      created++;
    }
    if (!lastGuid) return;
    toast.success(t("pickImport.review.created", { count: created }));
    setCreatedGuid(lastGuid);
  });

  const sourceSummary = !text.trim() ? null : isTabular ? (
    <Callout variant="info">
      {[
        csvImport.templates.find((row) => row.guid === csvImport.templateGuid)
          ? t("pickImport.source.savedLayout", {
              name: csvImport.templates.find(
                (row) => row.guid === csvImport.templateGuid,
              )?.name,
            })
          : t(
              `pickImport.source.formats.${detectSource(
                table.headers.map((header) => header.toLowerCase()),
              )}`,
            ),
        t("pickImport.source.rowCount", { count: table.rows.length }),
        t("pickImport.source.columnCount", { count: table.headers.length }),
      ].join(" · ")}
    </Callout>
  ) : (
    <Callout variant={plainListLines.length > 0 ? "info" : "warning"}>
      {plainListLines.length > 0
        ? t("fallback.decklist", { count: plainListLines.length })
        : t("fallback.unrecognized")}
    </Callout>
  );

  const title = tBusiness("orders.importTitle");
  const description = t("pickImport.description");
  const isSubmitting = form.formState.isSubmitting;
  const isLastStep = stepIndex === steps.length - 1;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto",
        MOBILE_NAV_SCROLL_PADDING_CLASS,
      )}
    >
      {isMobile ? (
        <MobilePageHeader
          title={title}
          subtitle={description}
          backTo={PICKS_PATH}
        />
      ) : (
        <PageHeader
          title={title}
          description={description}
          backTo={PICKS_PATH}
          backLabel={t("pickImport.back")}
        />
      )}
      <form
        onSubmit={(event) => event.preventDefault()}
        className={
          isMobile
            ? MOBILE_PAGE_BODY_CLASS
            : "mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:gap-3 md:px-3 md:py-3"
        }
      >
        {access?.isLocked && <BusinessUpgradeCallout />}
        {access && !access.isLocked && !access.canFulfilOrders && (
          <Callout variant="warning">{t("pickImport.noAccess")}</Callout>
        )}
        <PickImportSteps steps={steps} current={step} />
        <div className="flex flex-col gap-0.5">
          <h2
            ref={stepHeadingRef}
            tabIndex={-1}
            className="font-heading text-base font-semibold outline-none"
          >
            {t("pickImport.stepHeading", {
              current: stepIndex + 1,
              total: steps.length,
              title: t(`pickImport.headings.${step}`),
            })}
          </h2>
          <p className="text-sm text-foreground/70">
            {t(`pickImport.intros.${step}`)}
          </p>
        </div>

        {step === "source" && (
          <PickImportSource
            control={form.control}
            onFileRead={readFile}
            summary={sourceSummary}
          />
        )}
        {step === "columns" && <PickImportColumns csvImport={csvImport} />}
        {step === "review" && (
          <PickImportReview
            control={form.control}
            csvImport={csvImport}
            composed={composed}
            orders={rawOrders}
            plainListLines={plainListLines}
          />
        )}

        <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex items-center justify-between gap-1.5 border-t bg-background/80 px-4 py-2.5 backdrop-blur-2xl md:-mx-3 md:px-3">
          {stepIndex > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => goTo(steps[stepIndex - 1])}
            >
              <IconArrowLeft />
              {t("pickImport.actions.back")}
            </Button>
          ) : (
            <span />
          )}
          {isLastStep ? (
            <Button
              key="create"
              type="button"
              disabled={!canCreate || isSubmitting}
              onClick={() => void submit()}
            >
              {isSubmitting ? (
                <IconLoader2 className="animate-spin motion-reduce:animate-none" />
              ) : (
                <IconPackageImport />
              )}
              {t("pickImport.actions.create", { count: Math.max(requests.length, 1) })}
            </Button>
          ) : (
            <Button
              key="next"
              type="button"
              disabled={!canGoNext}
              onClick={() => goTo(steps[stepIndex + 1])}
            >
              {t("pickImport.actions.next")}
              <IconArrowRight />
            </Button>
          )}
        </div>
      </form>
      <UnsavedChangesGuard
        isDirty={text.trim() !== "" && createdGuid === null}
      />
    </div>
  );
}
