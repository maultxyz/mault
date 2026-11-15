import { Callout } from "@/components/callout";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { documentScanErrorMessage } from "@/features/scanner/lib/document-scan-errors";
import {
  feederCardRotationDegrees,
  rotateScanPage,
} from "@/features/scanner/lib/feeder-card-setup";
import {
  FEEDER_CARD_FEED_EDGES,
  FEEDER_CARD_SETUP_FORM_ID,
  FEEDER_CARD_SHEET_SIDES,
  FEEDER_CARD_TOPS,
} from "@/lib/constants/scanner";
import type {
  FeederCardSetupDialogProps,
  FeederCardSetupTestPage,
} from "@/lib/interfaces/scanner";
import {
  feederCardSetupSchema,
  type FeederCardSetupFormValues,
} from "@/schemas/feeder-card-setup.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2, IconScan } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function FeederCardSetupDialog({ open, onOpenChange }: FeederCardSetupDialogProps) {
  const { t } = useTranslation("scanner");
  const { t: tCards } = useTranslation("cards");
  const {
    feederCardSetup,
    saveFeederCardSetup,
    testFeederCardSetup,
  } = useCameraContext();
  const form = useForm<FeederCardSetupFormValues>({
    resolver: zodResolver(feederCardSetupSchema),
    defaultValues: feederCardSetup,
  });
  const [sheetSide, feedEdge, cardTop] = useWatch({
    control: form.control,
    name: ["sheetSide", "feedEdge", "cardTop"],
  });
  const [testScan, setTestScan] = useState<FeederCardSetupTestPage | null>(null);
  const [testPreviewUrl, setTestPreviewUrl] = useState<string | null>(null);
  const [isTestScanning, setIsTestScanning] = useState(false);
  const [testErrorMessage, setTestErrorMessage] = useState<string | null>(null);
  const testScanIsOutdated = !!testScan && testScan.scannedWith.sheetSide !== sheetSide;

  useEffect(() => {
    if (!open) return;
    form.reset(feederCardSetup);
    setTestScan(null);
    setTestErrorMessage(null);
  }, [open, feederCardSetup, form]);

  useEffect(() => {
    if (!testScan) {
      setTestPreviewUrl(null);
      return;
    }
    let isCurrent = true;
    let previewUrl: string | null = null;
    const rotationDegrees = feederCardRotationDegrees({ feedEdge, cardTop });
    void rotateScanPage(testScan.unrotatedPage, rotationDegrees)
      .then((rotatedPage) => {
        if (!isCurrent) return;
        previewUrl = URL.createObjectURL(rotatedPage);
        setTestPreviewUrl(previewUrl);
      })
      .catch((error: unknown) => {
        console.error("[feeder] rotating the test scan failed:", error);
        if (isCurrent) setTestErrorMessage(t("feederCardSetup.testFailed"));
      });
    return () => {
      isCurrent = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [testScan, feedEdge, cardTop, t]);

  const runTestScan = async () => {
    setIsTestScanning(true);
    setTestErrorMessage(null);
    try {
      const result = await testFeederCardSetup(form.getValues());
      if (result.type === "error") {
        setTestErrorMessage(
          documentScanErrorMessage(tCards, result.reason),
        );
        return;
      }
      setTestScan({ unrotatedPage: result.unrotatedPage, scannedWith: result.scannedWith });
    } finally {
      setIsTestScanning(false);
    }
  };

  const save = (values: FeederCardSetupFormValues) => {
    saveFeederCardSetup(values);
    onOpenChange(false);
  };

  const testStatusText = testScanIsOutdated
    ? t("feederCardSetup.testOutdated")
    : testPreviewUrl
      ? t("feederCardSetup.testResultHint")
      : t("feederCardSetup.noTestScanYet");

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("feederCardSetup.title")}
      description={t("feederCardSetup.description")}
      className="sm:max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("feederCardSetup.cancel")}
          </Button>
          <Button type="submit" form={FEEDER_CARD_SETUP_FORM_ID}>
            {t("feederCardSetup.save")}
          </Button>
        </>
      }
    >
      <form
        id={FEEDER_CARD_SETUP_FORM_ID}
        className="flex flex-col gap-3 md:gap-2 text-control sm:flex-row"
        onSubmit={form.handleSubmit(save)}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Controller
            control={form.control}
            name="sheetSide"
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("feederCardSetup.sheetSide.label")}</FieldLabel>
                <ResponsiveSegmented
                  label={t("feederCardSetup.sheetSide.label")}
                  items={FEEDER_CARD_SHEET_SIDES.map((side) => ({
                    key: side,
                    label: t(`feederCardSetup.sheetSide.options.${side}`),
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                />
                <p className="text-xs text-foreground/70">
                  {t("feederCardSetup.sheetSide.hint")}
                </p>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="feedEdge"
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("feederCardSetup.feedEdge.label")}</FieldLabel>
                <ResponsiveSegmented
                  label={t("feederCardSetup.feedEdge.label")}
                  items={FEEDER_CARD_FEED_EDGES.map((edge) => ({
                    key: edge,
                    label: t(`feederCardSetup.feedEdge.options.${edge}`),
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                />
                <p className="text-xs text-foreground/70">
                  {t(`feederCardSetup.feedEdge.hints.${field.value}`)}
                </p>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="cardTop"
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("feederCardSetup.cardTop.label")}</FieldLabel>
                <ResponsiveSegmented
                  label={t("feederCardSetup.cardTop.label")}
                  items={FEEDER_CARD_TOPS.map((top) => ({
                    key: top,
                    label: t(`feederCardSetup.cardTop.options.${top}`),
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                />
              </Field>
            )}
          />
          <Callout variant="info">{t("feederCardSetup.testInstructions")}</Callout>
          {testErrorMessage && <Callout variant="error">{testErrorMessage}</Callout>}
          <Button
            variant="outline"
            className="self-start"
            disabled={isTestScanning}
            onClick={() => void runTestScan()}
          >
            {isTestScanning ? (
              <IconLoader2 className="animate-spin motion-reduce:animate-none" />
            ) : (
              <IconScan />
            )}
            {isTestScanning
              ? t("feederCardSetup.testScanning")
              : testScan
                ? t("feederCardSetup.testAgain")
                : t("feederCardSetup.testScan")}
          </Button>
        </div>
        <div className="flex w-full shrink-0 flex-col items-center gap-1.5 sm:w-44">
          <div className="flex aspect-[2.5/3.5] w-44 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {testPreviewUrl && (
              <img
                src={testPreviewUrl}
                alt={t("feederCardSetup.testPreviewAlt")}
                className="size-full object-contain"
              />
            )}
          </div>
          <p role="status" className="text-center text-xs text-foreground/70">
            {testStatusText}
          </p>
        </div>
      </form>
    </DynamicDialog>
  );
}
