import { useQuery } from "@tanstack/react-query";
import { useKeepAwake } from "expo-keep-awake";
import { router, useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, type CameraRef, useCameraPermission, usePhotoOutput } from "react-native-vision-camera";
import {
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_MATCHES_NEEDED,
  DEFAULT_SCAN_REGION,
  OCR_REGIONS_BY_GAME_KEY,
  readsPrintedLanguageEveryScan,
  scanOcrMode,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { OptionSheet } from "@/components/ui/option-sheet";
import { useScanTarget } from "@/features/collections/api/use-scan-target";
import { orgSettingsQueryOptions } from "@/features/org/api/org-settings";
import { useCameraChoice } from "@/features/scanner/api/use-camera-choice";
import { useCameraTorch } from "@/features/scanner/api/use-camera-torch";
import { CameraChip } from "@/features/scanner/components/camera-chip";
import { CameraNotice } from "@/features/scanner/components/camera-notice";
import { ScanRegionOverlay } from "@/features/scanner/components/scan-region-overlay";
import { ShutterButton } from "@/features/scanner/components/shutter-button";
import { TorchBrightness } from "@/features/scanner/components/torch-brightness";
import { TorchToggle } from "@/features/scanner/components/torch-toggle";
import { captureFrame } from "@/features/scanner/lib/frame";
import { identifyCard } from "@/features/scanner/lib/identify";
import { warmScanModels } from "@/features/scanner/lib/inference";
import { useTradeDraft } from "@/features/trade-offers/api/use-trade-draft";
import { toOfferedTradeCard } from "@/features/trade-offers/lib/offered-card";
import { addOfferedCard } from "@/features/trade-offers/lib/trade-draft";
import { useAppState } from "@/hooks/use-app-state";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { CAMERA_ASPECT_RATIO, CAPTURE_TARGET_RESOLUTION } from "@/lib/constants/scanner";
import { TRADE_SCAN_NOTICE_TONES } from "@/lib/constants/trade";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { TradeScanNotice } from "@/lib/interfaces/trade";
import { useCameraMountReady } from "@/hooks/use-camera-mount-ready";

export default function TradeScanScreen() {
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
  const orgId = useActiveOrgId();
  const { data: orgSettings } = useQuery(orgSettingsQueryOptions(orgId));
  const scanTarget = useScanTarget();
  const draft = useTradeDraft();
  const [collectionGuid, setCollectionGuid] = useState<string | null>(null);
  const [pickingCollection, setPickingCollection] = useState(false);
  const collection =
    scanTarget.collections.find((candidate) => candidate.guid === collectionGuid) ?? scanTarget.collection;
  const photoOutput = usePhotoOutput({ targetResolution: CAPTURE_TARGET_RESOLUTION, qualityPrioritization: "speed" });
  const [frameAspect, setFrameAspect] = useState(CAMERA_ASPECT_RATIO);
  const [modelsReady, setModelsReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [notice, setNotice] = useState<TradeScanNotice | null>(null);
  const noticeId = useRef(0);
  const active = cameraMounted && appState === "active" && permission.hasPermission && !!device;
  const offeredCount = draft.offered.reduce((sum, card) => sum + card.quantity, 0);

  useEffect(() => {
    warmScanModels()
      .then(() => setModelsReady(true))
      .catch((err: unknown) => setModelError(err instanceof Error ? err.message : String(err)));
  }, []);

  const capture = useCallback(async () => {
    const frame = await captureFrame(photoOutput);
    const { width, height } = frame.pixels;
    if (width > 0 && height > 0) setFrameAspect(Math.min(width, height) / Math.max(width, height));
    return frame;
  }, [photoOutput]);

  const showNotice = (next: Omit<TradeScanNotice, "noticeId">) => {
    noticeId.current += 1;
    setNotice({ ...next, noticeId: noticeId.current });
  };

  const scan = async () => {
    if (!collection) return;
    const gameKey = collection.game?.key ?? "";
    setIsIdentifying(true);
    try {
      const outcome = await identifyCard(
        capture,
        {
          scope: { collectionGuid: collection.guid },
          matchesNeeded: DEFAULT_MATCHES_NEEDED,
          checkBothOrientations: DEFAULT_CHECK_BOTH_ORIENTATIONS,
          ocrMode: scanOcrMode(
            orgSettings,
            (OCR_REGIONS_BY_GAME_KEY[gameKey]?.length ?? 0) > 0,
            readsPrintedLanguageEveryScan(collection, gameKey),
          ),
          gameKey: gameKey || null,
        },
        DEFAULT_SCAN_REGION,
      );
      const offered = outcome.card ? toOfferedTradeCard(outcome.card, collection, {}) : null;
      if (!outcome.card || !offered) {
        showNotice({ kind: "no-match" });
        return;
      }
      addOfferedCard(offered);
      showNotice({ kind: "added", cardName: outcome.card.name });
      AccessibilityInfo.announceForAccessibility(t("trade.added", { name: outcome.card.name }));
    } catch {
      showNotice({ kind: "failed" });
    } finally {
      setIsIdentifying(false);
    }
  };

  const noticeTitle = (current: TradeScanNotice) =>
    current.kind === "added"
      ? t("trade.added", { name: current.cardName ?? "" })
      : current.kind === "no-match"
        ? t("trade.scanNoMatch")
        : t("trade.scanFailed");

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
        <>
          {cameraMounted ? (
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
          ) : null}
          <ScanRegionOverlay
            region={DEFAULT_SCAN_REGION}
            frameAspect={frameAspect}
            strokeColor={isIdentifying ? colors.success : colors.onCamera}
          />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { justifyContent: "center" }]}>
          <EmptyState icon="camera" title={t("scan.noCamera")} />
        </View>
      )}

      <View
        pointerEvents="box-none"
        style={{ paddingTop: insets.top + SPACING.md, paddingHorizontal: SCREEN_GUTTER, gap: SPACING.sm }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
          <View style={{ flex: 1, minWidth: 0, alignItems: "flex-start" }}>
            <CameraChip
              icon="collections"
              label={collection?.name ?? t("trade.pickCollection")}
              onPress={() => setPickingCollection(true)}
            />
          </View>
          <CameraChip
            dotColor={offeredCount > 0 ? colors.success : colors.warning}
            label={t("trade.givingCount", { count: offeredCount })}
          />
          <TorchToggle torch={torch} />
        </View>
        <TorchBrightness torch={torch} />
      </View>

      <View
        style={{
          position: "absolute",
          left: SCREEN_GUTTER,
          right: SCREEN_GUTTER,
          bottom: insets.bottom + SPACING.lg,
          gap: SPACING.md,
        }}
      >
        {modelError ? (
          <CameraNotice tone="destructive" title={t("scan.modelErrorTitle")} description={modelError} />
        ) : notice ? (
          <CameraNotice key={notice.noticeId} tone={TRADE_SCAN_NOTICE_TONES[notice.kind]} title={noticeTitle(notice)} />
        ) : (
          <AppText size="xs" style={{ color: colors.onCamera, textAlign: "center" }}>
            {modelsReady ? t("trade.scanHint") : t("storage.pickList.scan.loadingModels")}
          </AppText>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
          <Button style={{ flex: 1 }} variant="secondary" label={t("trade.done")} onPress={() => router.back()} />
          <ShutterButton
            running={isIdentifying}
            icon="camera"
            label={t("trade.scanButton")}
            disabled={!active || !modelsReady || !!modelError || isIdentifying || !collection}
            onPress={() => void scan()}
          />
        </View>
      </View>
      <OptionSheet
        visible={pickingCollection}
        title={t("trade.scanCollectionLabel")}
        options={scanTarget.collections.map((candidate) => ({
          value: candidate.guid,
          label: candidate.name,
          badge: candidate.game?.name,
        }))}
        selected={collection ? [collection.guid] : []}
        onSelect={(guid) => {
          setCollectionGuid(guid);
          setPickingCollection(false);
        }}
        onClose={() => setPickingCollection(false)}
      />
    </View>
  );
}
