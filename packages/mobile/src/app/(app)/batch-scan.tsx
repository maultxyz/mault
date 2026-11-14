import { useKeepAwake } from "expo-keep-awake";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, type CameraRef, useCameraPermission, usePhotoOutput } from "react-native-vision-camera";
import { AppText } from "@/components/ui/app-text";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Surface } from "@/components/ui/surface";
import { useBatchScan } from "@/features/scanner/api/use-batch-scan";
import { useCameraChoice } from "@/features/scanner/api/use-camera-choice";
import { useCameraTorch } from "@/features/scanner/api/use-camera-torch";
import { TorchBrightness } from "@/features/scanner/components/torch-brightness";
import { TorchToggle } from "@/features/scanner/components/torch-toggle";
import { BatchScanCorrectionSheet } from "@/features/scanner/components/batch-scan-correction-sheet";
import { BatchScanPhoto } from "@/features/scanner/components/batch-scan-photo";
import { BatchScanRow } from "@/features/scanner/components/batch-scan-row";
import { CameraChip } from "@/features/scanner/components/camera-chip";
import { CameraNotice } from "@/features/scanner/components/camera-notice";
import { ScanRemovalQueueSheet } from "@/features/scanner/components/scan-removal-queue-sheet";
import { ShutterButton } from "@/features/scanner/components/shutter-button";
import { captureFrame } from "@/features/scanner/lib/frame";
import { warmScanModels } from "@/features/scanner/lib/inference";
import { useAppState } from "@/hooks/use-app-state";
import { useTheme } from "@/hooks/use-theme";
import { BATCH_CAPTURE_TARGET_RESOLUTION, BATCH_WORKING_LONG_SIDE } from "@/lib/constants/scanner";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { BatchScanMode } from "@/lib/interfaces/scanner";
import { useCameraMountReady } from "@/hooks/use-camera-mount-ready";

export default function BatchScanScreen() {
  useKeepAwake();
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const cameraMounted = useCameraMountReady(focused);
  const appState = useAppState();
  const permission = useCameraPermission();
  const camera = useCameraChoice();
  const cameraRef = useRef<CameraRef>(null);
  const device = camera.device;
  const torch = useCameraTorch(device, cameraRef);
  const photoOutput = usePhotoOutput({ targetResolution: BATCH_CAPTURE_TARGET_RESOLUTION, qualityPrioritization: "balanced" });
  const { mode: initialMode } = useLocalSearchParams<{ mode?: BatchScanMode }>();
  const batch = useBatchScan(initialMode === "remove" ? "remove" : "add");
  const [modelsReady, setModelsReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [correctingKey, setCorrectingKey] = useState<string | null>(null);
  const [removalReviewOpen, setRemovalReviewOpen] = useState(false);
  const isRemoveMode = batch.mode === "remove";
  const correcting = batch.cards.find((card) => card.key === correctingKey) ?? null;
  const isReviewing = !!batch.photo;
  const active = cameraMounted && appState === "active" && permission.hasPermission && !!device && !isReviewing;
  const isProcessing = !!batch.progress;
  const includedCount = batch.cards.filter(
    (card) => card.included && (card.status === "done" || !!card.correctedCard),
  ).length;

  useEffect(() => {
    warmScanModels()
      .then(() => setModelsReady(true))
      .catch((err: unknown) => setModelError(err instanceof Error ? err.message : String(err)));
  }, []);

  const takePhoto = async () => {
    setIsCapturing(true);
    try {
      const frame = await captureFrame(photoOutput, BATCH_WORKING_LONG_SIDE);
      setIsCapturing(false);
      await batch.processPhoto(frame);
    } catch {
      setIsCapturing(false);
      Alert.alert(t("batchScan.captureFailed"));
    }
  };

  const saveCards = async () => {
    const { saved, failed } = await batch.save();
    if (failed > 0) {
      Alert.alert(t("batchScan.savePartialTitle", { count: saved }), t("batchScan.savePartialDescription", { count: failed }));
      return;
    }
    Alert.alert(t("batchScan.savedTitle", { count: saved }), batch.collection?.name);
    router.back();
  };

  const reviewRemoval = async () => {
    const failedLookups = await batch.queueCardsForRemoval();
    if (failedLookups > 0) {
      Alert.alert(
        t("batchScan.removalLookupFailedTitle", { count: failedLookups }),
        t("batchScan.removalLookupFailedDescription"),
      );
      return;
    }
    setRemovalReviewOpen(true);
  };

  const finishRemoval = (removedCount: number) => {
    Alert.alert(t("scan.removal.notice.removed", { count: removedCount }), batch.collection?.name);
    router.back();
  };

  const modeControl = (
    <View style={{ alignSelf: "stretch" }} pointerEvents={batch.isSaving || batch.isQueueingRemoval ? "none" : "auto"}>
      <SegmentedControl
        options={[
          { value: "add", label: t("batchScan.modeAdd") },
          { value: "remove", label: t("batchScan.modeRemove") },
        ]}
        value={batch.mode}
        onChange={batch.setMode}
      />
    </View>
  );

  const progressText = batch.progress
    ? batch.progress.stage === "finding"
      ? t("batchScan.finding", { done: batch.progress.done, total: batch.progress.total })
      : t("batchScan.identifyingProgress", { done: batch.progress.done + 1, total: batch.progress.total })
    : batch.cards.length === 0
      ? null
      : t("batchScan.found", { count: batch.cards.length });

  if (isReviewing && batch.photo) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        {focused ? <StatusBar style="auto" /> : null}
        <PageHeader
          title={t("batchScan.title")}
          subtitle={batch.collection?.name}
          onBack={() => router.back()}
        />
        <ScrollView contentContainerStyle={{ paddingTop: SCREEN_GUTTER, paddingBottom: SPACING.xl, gap: SPACING.lg + SPACING.xs }}>
          <View style={{ paddingHorizontal: SCREEN_GUTTER, gap: SPACING.sm }}>
            {modeControl}
            <BatchScanPhoto photo={batch.photo} cards={batch.cards} />
            {progressText ? (
              <AppText size="sm" tone="secondary" accessibilityLiveRegion="polite">
                {progressText}
              </AppText>
            ) : null}
          </View>
          {!isProcessing && batch.cards.length === 0 ? (
            <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
              <Callout tone="warning" title={t("batchScan.noneFoundTitle")} description={t("batchScan.noneFoundDescription")} />
            </View>
          ) : (
            <Surface padded={false} style={{ marginHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.xs }}>
              {batch.cards.map((card, index) => (
                <View key={card.key}>
                  <BatchScanRow
                    index={index}
                    card={card}
                    isRemoveMode={isRemoveMode}
                    onToggleIncluded={() => batch.toggleIncluded(card.key)}
                    onCorrect={() => setCorrectingKey(card.key)}
                  />
                </View>
              ))}
            </Surface>
          )}
        </ScrollView>
        <BottomActionBar direction="row">
          <Button
            style={{ flex: 1 }}
            variant="secondary"
            icon="camera"
            label={t("batchScan.retake")}
            disabled={batch.isSaving || batch.isQueueingRemoval}
            onPress={batch.reset}
          />
          {isRemoveMode ? (
            <Button
              style={{ flex: 1 }}
              variant="destructive"
              icon="trash"
              label={t("batchScan.reviewRemoval", { count: batch.removableCount })}
              loading={batch.isQueueingRemoval}
              disabled={isProcessing || batch.removableCount === 0}
              onPress={() => void reviewRemoval()}
            />
          ) : (
            <Button
              style={{ flex: 1 }}
              icon="plus"
              label={t("batchScan.addCards", { count: includedCount })}
              loading={batch.isSaving}
              disabled={isProcessing || includedCount === 0}
              onPress={() => void saveCards()}
            />
          )}
        </BottomActionBar>
        {batch.collection ? (
          <BatchScanCorrectionSheet
            card={correcting}
            collectionGuid={batch.collection.guid}
            onSelect={(selected) => {
              if (correctingKey) batch.correctCard(correctingKey, selected);
              setCorrectingKey(null);
            }}
            onClose={() => setCorrectingKey(null)}
          />
        ) : null}
        {batch.collection ? (
          <ScanRemovalQueueSheet
            visible={removalReviewOpen}
            removal={batch.removal}
            collectionName={batch.collection.name}
            onClose={() => setRemovalReviewOpen(false)}
            onRemoved={finishRemoval}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.camera }}>
      {focused ? <StatusBar style="light" /> : null}
      {!permission.hasPermission ? (
        <View style={[StyleSheet.absoluteFill, { justifyContent: "center", padding: SCREEN_GUTTER }]}>
          <EmptyState
            icon="camera"
            title={t("scan.cameraPermissionTitle")}
            description={t("scan.cameraPermissionDescription")}
            action={<Button label={t("scan.allowCamera")} onPress={() => void permission.requestPermission()} />}
          />
        </View>
      ) : device ? (
        cameraMounted ? (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={active}
            outputs={[photoOutput]}
            resizeMode="cover"
            enableNativeTapToFocusGesture
            onStarted={torch.onCameraStarted}
          />
        ) : null
      ) : (
        <View style={[StyleSheet.absoluteFill, { justifyContent: "center" }]}>
          <EmptyState icon="camera" title={t("scan.noCamera")} />
        </View>
      )}

      <View
        pointerEvents="box-none"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: SPACING.sm,
          paddingTop: insets.top + SPACING.md,
          paddingHorizontal: SCREEN_GUTTER,
        }}
      >
        <IconButton icon="back" variant="camera" accessibilityLabel={t("common.back")} onPress={() => router.back()} />
        <View style={{ flex: 1, minWidth: 0, alignItems: "flex-start" }}>
          <CameraChip
            icon="multiCard"
            dotColor={isRemoveMode ? colors.destructive : undefined}
            label={
              batch.collection
                ? isRemoveMode
                  ? t("scan.removal.title", { collection: batch.collection.name })
                  : batch.collection.name
                : t("batchScan.title")
            }
          />
        </View>
        <TorchToggle torch={torch} />
      </View>
      <View pointerEvents="box-none" style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.sm }}>
        <TorchBrightness torch={torch} />
      </View>

      <View
        style={{
          position: "absolute",
          left: SCREEN_GUTTER,
          right: SCREEN_GUTTER,
          bottom: insets.bottom + SPACING.lg,
          gap: SPACING.md,
          alignItems: "center",
        }}
      >
        {modelError ? (
          <CameraNotice tone="destructive" title={t("scan.modelErrorTitle")} description={modelError} />
        ) : !batch.collection ? (
          <CameraNotice tone="warning" title={t("scan.noCollectionTitle")} description={t("scan.noCollectionDescription")} />
        ) : (
          <View style={{ alignItems: "center", gap: SPACING.xs }}>
            <AppText
              accessibilityRole="header"
              size="lg"
              heading
              weight="semibold"
              style={{ color: colors.onCamera, textAlign: "center" }}
            >
              {t("batchScan.title")}
            </AppText>
            <AppText size="sm" style={{ color: colors.onCamera, textAlign: "center" }}>
              {modelsReady ? t("batchScan.hint") : t("batchScan.loadingModels")}
            </AppText>
          </View>
        )}
        {modeControl}
        <ShutterButton
          running={isCapturing}
          icon="camera"
          label={t("batchScan.takePhoto")}
          disabled={!active || !modelsReady || !!modelError || isCapturing || !batch.collection}
          onPress={() => void takePhoto()}
        />
      </View>
    </View>
  );
}
