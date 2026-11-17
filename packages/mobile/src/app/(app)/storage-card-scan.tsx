import { useQuery } from "@tanstack/react-query";
import { useKeepAwake } from "expo-keep-awake";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, useCameraPermission, usePhotoOutput } from "react-native-vision-camera";
import {
  COLOR_BAR_REGIONS_BY_GAME_KEY,
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_MATCHES_NEEDED,
  DEFAULT_SCAN_REGION,
  findCardForScan,
  OCR_REGIONS_BY_GAME_KEY,
  scanCheckCollectionGuid,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { orgSettingsQueryOptions } from "@/features/org/api/org-settings";
import { useCameraChoice } from "@/features/scanner/api/use-camera-choice";
import { CameraChip } from "@/features/scanner/components/camera-chip";
import { CameraNotice } from "@/features/scanner/components/camera-notice";
import { ScanRegionOverlay } from "@/features/scanner/components/scan-region-overlay";
import { ShutterButton } from "@/features/scanner/components/shutter-button";
import { captureFrame } from "@/features/scanner/lib/frame";
import { identifyCard } from "@/features/scanner/lib/identify";
import { warmScanModels } from "@/features/scanner/lib/inference";
import { useStoragePickList } from "@/features/storage/api/use-storage-pick-list";
import { useStorageVerify } from "@/features/storage/api/use-storage-verify";
import { useAppState } from "@/hooks/use-app-state";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { CAMERA_ASPECT_RATIO, CAPTURE_TARGET_RESOLUTION, CARD_SCAN_NOTICE_TONES } from "@/lib/constants/scanner";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { CardScanNotice } from "@/lib/interfaces/storage";

export default function StorageCardScanScreen() {
  useKeepAwake();
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const appState = useAppState();
  const permission = useCameraPermission();
  const camera = useCameraChoice();
  const device = camera.device;
  const orgId = useActiveOrgId();
  const { data: orgSettings } = useQuery(orgSettingsQueryOptions(orgId));
  const { data: collections } = useQuery(collectionsQueryOptions(orgId));
  const { verifyGuid } = useLocalSearchParams<{ verifyGuid?: string }>();
  const isVerifying = !!verifyGuid;
  const pickList = useStoragePickList();
  const verify = useStorageVerify(verifyGuid);
  const source = isVerifying
    ? {
        cards: verify.cards,
        checkedScanIds: verify.verifiedScanIds,
        checkedCount: verify.verifiedCount,
        setChecked: verify.setVerified,
        onNotListed: verify.addNotInLocation,
      }
    : {
        cards: pickList.cards,
        checkedScanIds: pickList.pickedScanIds,
        checkedCount: pickList.pickedCount,
        setChecked: pickList.setPicked,
        onNotListed: undefined,
      };
  const latestSource = useRef(source);
  latestSource.current = source;
  const photoOutput = usePhotoOutput({ targetResolution: CAPTURE_TARGET_RESOLUTION, qualityPrioritization: "speed" });
  const [frameAspect, setFrameAspect] = useState(CAMERA_ASPECT_RATIO);
  const [modelsReady, setModelsReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [notice, setNotice] = useState<CardScanNotice | null>(null);
  const noticeId = useRef(0);
  const active = focused && appState === "active" && permission.hasPermission && !!device;
  const scanCollectionGuid = scanCheckCollectionGuid(source.cards, source.checkedScanIds);
  const remaining = source.cards.length - source.checkedCount;

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

  const showNotice = (next: Omit<CardScanNotice, "noticeId">) => {
    noticeId.current += 1;
    setNotice({ ...next, noticeId: noticeId.current });
  };

  const scan = async () => {
    if (!scanCollectionGuid) return;
    const gameKey = collections?.find((collection) => collection.guid === scanCollectionGuid)?.game?.key ?? "";
    setIsIdentifying(true);
    try {
      const outcome = await identifyCard(
        capture,
        {
          scope: { collectionGuid: scanCollectionGuid },
          matchesNeeded: DEFAULT_MATCHES_NEEDED,
          checkBothOrientations: DEFAULT_CHECK_BOTH_ORIENTATIONS,
          ocrEnabled: !!orgSettings?.ocrEnabled && (OCR_REGIONS_BY_GAME_KEY[gameKey]?.length ?? 0) > 0,
          colorBarRegionKey: COLOR_BAR_REGIONS_BY_GAME_KEY[gameKey] ? gameKey : null,
        },
        DEFAULT_SCAN_REGION,
      );
      if (!outcome.card) {
        showNotice({ kind: "no-match" });
        return;
      }
      const latest = latestSource.current;
      const match = findCardForScan(latest.cards, latest.checkedScanIds, outcome.card);
      if (!match) {
        latest.onNotListed?.(outcome.card.name);
        showNotice({ kind: "not-listed", cardName: outcome.card.name });
        return;
      }
      if (match.kind === "unchecked") latest.setChecked(match.card.scanId, true);
      showNotice({
        kind: match.kind === "unchecked" ? "checked" : "already-checked",
        cardName: match.card.card.name,
        locationName: match.card.locationName,
        position: match.card.position,
      });
    } catch {
      showNotice({ kind: "failed" });
    } finally {
      setIsIdentifying(false);
    }
  };

  const noticeTitle = (current: CardScanNotice) => {
    const name = current.cardName ?? "";
    switch (current.kind) {
      case "checked":
        return isVerifying
          ? t("storage.verify.scan.verified", { name, position: current.position ?? 0 })
          : t("storage.pickList.scan.picked", {
              name,
              location: current.locationName ?? "",
              position: current.position ?? 0,
            });
      case "already-checked":
        return isVerifying
          ? t("storage.verify.scan.alreadyVerified", { name })
          : t("storage.pickList.scan.alreadyPicked", { name });
      case "not-listed":
        return isVerifying
          ? t("storage.verify.scan.notInLocation", { name })
          : t("storage.pickList.scan.notOnList", { name });
      case "no-match":
        return t("storage.pickList.scan.noMatch");
      case "failed":
        return t("storage.pickList.scan.failed");
    }
  };

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
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={active}
            outputs={[photoOutput]}
            resizeMode="cover"
            enableNativeTapToFocusGesture
          />
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
              icon="checkAll"
              label={isVerifying ? t("storage.verify.scan.title") : t("storage.pickList.scan.title")}
            />
          </View>
          <CameraChip
            dotColor={remaining > 0 ? colors.warning : colors.success}
            label={
              isVerifying
                ? t("storage.verify.scan.remaining", { count: remaining })
                : t("storage.pickList.scan.remaining", { count: remaining })
            }
          />
        </View>
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
          <CameraNotice key={notice.noticeId} tone={CARD_SCAN_NOTICE_TONES[notice.kind]} title={noticeTitle(notice)} />
        ) : (
          <AppText size="xs" style={{ color: colors.onCamera, textAlign: "center" }}>
            {modelsReady
              ? isVerifying
                ? t("storage.verify.scan.hint")
                : t("storage.pickList.scan.hint")
              : t("storage.pickList.scan.loadingModels")}
          </AppText>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
          <Button
            style={{ flex: 1 }}
            variant="secondary"
            label={t("storage.pickList.scan.done")}
            onPress={() => router.back()}
          />
          <ShutterButton
            running={isIdentifying}
            icon="camera"
            label={isVerifying ? t("storage.verify.scan.button") : t("storage.pickList.scan.button")}
            disabled={!active || !modelsReady || !!modelError || isIdentifying || !scanCollectionGuid}
            onPress={() => void scan()}
          />
        </View>
      </View>
    </View>
  );
}
