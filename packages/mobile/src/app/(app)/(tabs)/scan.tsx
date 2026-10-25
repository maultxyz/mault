import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { router, useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_SCAN_REGION } from "@magic-vault/shared";
import {
  Camera,
  type CameraRef,
  useCameraPermission,
  usePhotoOutput,
} from "react-native-vision-camera";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { cardSetsQueryOptions } from "@/features/cards/api/card-sets";
import { collectionsQueryOptions, setActiveCollection } from "@/features/collections/api/collections";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { activateBinSet } from "@/features/rules/api/bin-sets";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { useLiveCorners } from "@/features/scanner/api/use-live-corners";
import { useCameraChoice } from "@/features/scanner/api/use-camera-choice";
import { useScanSession } from "@/features/scanner/api/use-scan-session";
import { CameraChip } from "@/features/scanner/components/camera-chip";
import { BinBadge } from "@/features/scanner/components/bin-badge";
import { CameraNotice } from "@/features/scanner/components/camera-notice";
import { DetectedOutline } from "@/features/scanner/components/detected-outline";
import { ScanRegionOverlay } from "@/features/scanner/components/scan-region-overlay";
import { ScanOptionsSheet } from "@/features/scanner/components/scan-options-sheet";
import { ScannerControlsSheet } from "@/features/scanner/components/scanner-controls-sheet";
import { SessionScansSheet } from "@/features/scanner/components/session-scans-sheet";
import { ShutterButton } from "@/features/scanner/components/shutter-button";
import { captureFrame } from "@/features/scanner/lib/frame";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { useAppState } from "@/hooks/use-app-state";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import {
  ANY_SET_OPTION,
  CAMERA_ASPECT_RATIO,
  CAPTURE_TARGET_RESOLUTION,
  CARD_SET_PICKER_LIMIT,
  LIVE_DETECTION_PAUSED_PHASES,
  NOT_FOIL_OPTION,
  PAUSE_TONES,
  RUNNING_PHASES,
} from "@/lib/constants/scanner";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { SHUTTER_SIZE } from "@/lib/constants/ui";

export default function ScanScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const appState = useAppState();
  const sorter = useSorter();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const { data: collections } = useQuery(collectionsQueryOptions(orgId));
  const collection = collections?.find((c) => c.isActive) ?? null;
  const foilTypes = collection?.game?.foilTypes ?? [];
  const { sets: presets, activeSet } = useRulesData();
  const activePreset = activeSet?.isActive ? activeSet : null;
  const switchCollection = useMutation({
    mutationFn: setActiveCollection,
    onSuccess: (next) => queryClient.setQueryData(collectionsQueryOptions(orgId).queryKey, next),
  });
  const switchPreset = useMutation({
    mutationFn: activateBinSet,
    onSuccess: (next) => queryClient.setQueryData(binSetsQueryOptions(orgId).queryKey, next),
  });
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const [presetPickerOpen, setPresetPickerOpen] = useState(false);
  const [cameraPickerOpen, setCameraPickerOpen] = useState(false);
  const [foilTypePickerOpen, setFoilTypePickerOpen] = useState(false);
  const [setPickerOpen, setSetPickerOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const permission = useCameraPermission();
  const camera = useCameraChoice();
  const device = camera.device;
  const photoOutput = usePhotoOutput({
    targetResolution: CAPTURE_TARGET_RESOLUTION,
    qualityPrioritization: "speed",
  });
  const [frameAspect, setFrameAspect] = useState(CAMERA_ASPECT_RATIO);
  const capture = useCallback(async () => {
    const frame = await captureFrame(photoOutput);
    const { width, height } = frame.pixels;
    if (width > 0 && height > 0) setFrameAspect(Math.min(width, height) / Math.max(width, height));
    return frame;
  }, [photoOutput]);
  const session = useScanSession({ capture });
  const { data: cardSets } = useQuery({
    ...cardSetsQueryOptions(collection?.guid ?? null),
    enabled: !!collection?.guid && (setPickerOpen || !!session.forcedSetCode),
  });
  const confirmMarkFullBinsEmpty = () =>
    Alert.alert(
      t("scan.emptyBin.confirmTitle", { bins: session.fullBinNumbers.join(", ") }),
      t("scan.emptyBin.confirmDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("scan.emptyBin.confirm"),
          onPress: () => {
            void session.markFullBinsEmpty().then((marked) => {
              if (!marked) Alert.alert(t("scan.emptyBin.failed"));
            });
          },
        },
      ],
    );
  const forcedSetName = session.forcedSetCode
    ? (cardSets?.find((cardSet) => cardSet.code === session.forcedSetCode)?.name ?? session.forcedSetCode.toUpperCase())
    : t("scan.options.anySet");
  const working = RUNNING_PHASES.includes(session.phase);
  const cameraRef = useRef<CameraRef>(null);
  const liveCorners = useLiveCorners(
    cameraRef,
    focused && appState === "active" && !!device && permission.hasPermission && !session.modelError,
    LIVE_DETECTION_PAUSED_PHASES.includes(session.phase),
    session.trackLiveCorners,
  );
  const lastBin = sorter.isReady ? undefined : session.feed[0]?.binNumber;
  const [sessionOpen, setSessionOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const sorterDriven = sorter.isReady || session.handScanActive;
  const canScanOnce = !!collection && !session.modelError && session.phase !== "loading-models";
  const phaseColor =
    session.phase === "error"
      ? colors.destructive
      : working
        ? colors.success
        : session.phase === "paused" || session.phase === "loading-models"
          ? colors.warning
          : undefined;
  const pauseNotice = session.phase === "paused" && session.pauseReason && session.pauseReason !== "user";
  const cameraLabel = (index: number) =>
    camera.devices[index]?.localizedName || t("scan.options.cameraFallback", { number: index + 1 });
  const selectedCameraIndex = camera.devices.findIndex((d) => d.id === device?.id);

  useEffect(() => {
    if (!session.isRunning) return;
    void activateKeepAwakeAsync();
    return () => {
      void deactivateKeepAwake();
    };
  }, [session.isRunning]);

  if (!permission.hasPermission) {
    return (
      <Screen header={<PageHeader title={t("tabs.scan")} />}>
        <EmptyState
          icon="camera"
          title={t("scan.cameraPermissionTitle")}
          description={t("scan.cameraPermissionDescription")}
          action={
            permission.canRequestPermission ? (
              <Button label={t("scan.allowCamera")} onPress={() => void permission.requestPermission()} />
            ) : (
              <AppText tone="secondary">{t("scan.cameraPermissionSettings")}</AppText>
            )
          }
        />
      </Screen>
    );
  }

  const notice = session.modelError ? (
    <CameraNotice tone="destructive" title={t("scan.modelErrorTitle")} description={session.modelError} />
  ) : !collection ? (
    <CameraNotice
      tone="warning"
      title={t("scan.noCollectionTitle")}
      description={t("scan.noCollectionDescription")}
      actionLabel={t("scan.chooseCollection")}
      onAction={() => setCollectionPickerOpen(true)}
    />
  ) : switchCollection.isError ? (
    <CameraNotice tone="destructive" title={t("collections.activateFailed")} />
  ) : switchPreset.isError ? (
    <CameraNotice tone="destructive" title={t("rules.activateFailed")} />
  ) : sorter.notice ? (
    <CameraNotice
      tone="warning"
      title={t("sorter.restarted.title")}
      description={t(`sorter.resetReasons.${sorter.notice.reason}`)}
      actionLabel={t("common.dismiss")}
      onAction={sorter.dismissNotice}
    />
  ) : pauseNotice && session.pauseReason ? (
    <CameraNotice
      tone={PAUSE_TONES[session.pauseReason]}
      title={t(`scan.pause.${session.pauseReason}.title`)}
      description={t(`scan.pause.${session.pauseReason}.description`, { detail: session.pauseDetail ?? "" })}
      {...(session.pauseReason === "bin-full" && session.fullBinNumbers.length > 0
        ? { actionLabel: t("scan.emptyBin.action"), onAction: confirmMarkFullBinsEmpty }
        : {})}
    />
  ) : !sorter.isConnected && !session.handScan && session.sessionCount === 0 ? (
    <CameraNotice
      tone="info"
      title={t("scan.sorterNotReadyTitle")}
      description={t("scan.sorterNotReadyDescription")}
      actionLabel={t("scan.openSorter")}
      onAction={() => router.push("/sorter")}
    />
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.camera }}>
      {focused ? <StatusBar style="light" /> : null}
      {device ? (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={focused && appState === "active"}
          outputs={[photoOutput]}
          resizeMode="cover"
          enableNativeTapToFocusGesture
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { justifyContent: "center" }]}>
          <EmptyState icon="camera" title={t("scan.noCamera")} />
        </View>
      )}
      {device ? (
        <ScanRegionOverlay
          region={sorter.device?.scanRegion ?? DEFAULT_SCAN_REGION}
          frameAspect={frameAspect}
          strokeColor={working ? colors.success : colors.onCamera}
        />
      ) : null}
      {device ? <DetectedOutline corners={liveCorners} color={colors.primary} /> : null}

      <View
        pointerEvents="box-none"
        style={{ paddingTop: insets.top + SPACING.md, paddingHorizontal: SCREEN_GUTTER, gap: SPACING.md }}
      >
        <View pointerEvents="box-none" style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <CameraChip dotColor={phaseColor} label={t(`scan.phase.${session.phase}`)} />
          </View>
          <CameraChip
            icon="collections"
            label={t("scan.sessionChip", { count: session.sessionCount })}
            onPress={() => setSessionOpen(true)}
          />
          <View style={{ flex: 1 }} />
          <IconButton
            icon="more"
            variant="camera"
            size={36}
            accessibilityLabel={t("scan.options.title")}
            onPress={() => setOptionsOpen(true)}
          />
        </View>
        {lastBin != null ? (
          <View pointerEvents="none" style={{ alignItems: "center" }}>
            <BinBadge key={session.feed[0]?.scanId} binNumber={lastBin} />
          </View>
        ) : null}
      </View>

      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <View
          pointerEvents="box-none"
          style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.lg, gap: SPACING.md }}
        >
          {notice}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: SPACING.md }}>
            <IconButton
              icon="adjust"
              variant="camera"
              size={SHUTTER_SIZE - SPACING.sm}
              accessibilityLabel={t("scan.controls.open")}
              onPress={() => setControlsOpen(true)}
            />
            {sorterDriven ? (
              <ShutterButton
                running={session.isRunning}
                icon={session.isRunning ? "pause" : "play"}
                label={
                  session.isRunning ? t("scan.pauseAction") : session.phase === "paused" ? t("scan.resume") : t("scan.start")
                }
                disabled={!session.isRunning && !session.canStart}
                onPress={
                  session.isRunning ? session.pause : session.phase === "paused" ? session.resume : session.start
                }
              />
            ) : (
              <ShutterButton
                running={false}
                icon="camera"
                label={t("scan.scanOnce")}
                disabled={!canScanOnce || RUNNING_PHASES.includes(session.phase)}
                onPress={session.scanOnce}
              />
            )}
          </View>
        </View>
      </View>
      <ScanOptionsSheet
        visible={optionsOpen}
        running={session.isRunning}
        autoFeed={session.autoFeed}
        onAutoFeedChange={session.setAutoFeed}
        allowDuplicates={session.allowDuplicates}
        onAllowDuplicatesChange={session.setAllowDuplicates}
        handScan={session.handScan}
        onHandScanChange={session.setHandScan}
        collectionName={collection?.name ?? null}
        presetName={activePreset?.name ?? null}
        showPreset={!!collection?.game && presets.length > 0}
        cameraName={selectedCameraIndex >= 0 ? cameraLabel(selectedCameraIndex) : null}
        showCamera={camera.devices.length > 1}
        foilTypeName={session.forcedFoilType ?? t("scan.options.notFoil")}
        showFoilType={foilTypes.length > 0}
        setName={forcedSetName}
        onChooseFoilType={() => {
          setOptionsOpen(false);
          setFoilTypePickerOpen(true);
        }}
        onChooseSet={() => {
          setOptionsOpen(false);
          setSetPickerOpen(true);
        }}
        onChooseCollection={() => {
          setOptionsOpen(false);
          setCollectionPickerOpen(true);
        }}
        onChoosePreset={() => {
          setOptionsOpen(false);
          setPresetPickerOpen(true);
        }}
        onChooseCamera={() => {
          setOptionsOpen(false);
          setCameraPickerOpen(true);
        }}
        onClose={() => setOptionsOpen(false)}
      />
      <ScannerControlsSheet
        visible={controlsOpen}
        running={session.isRunning}
        canScan={canScanOnce}
        onScanNow={session.scanOnce}
        onFeedOne={session.feedOnce}
        autoFeed={session.autoFeed}
        onClose={() => setControlsOpen(false)}
      />
      <OptionSheet
        visible={collectionPickerOpen}
        title={t("scan.chooseCollection")}
        options={(collections ?? []).map((c) => ({ value: c.guid, label: c.name }))}
        selected={collection ? [collection.guid] : []}
        onSelect={(guid) => {
          setCollectionPickerOpen(false);
          if (guid !== collection?.guid) switchCollection.mutate(guid);
        }}
        onClose={() => setCollectionPickerOpen(false)}
      />
      <OptionSheet
        visible={presetPickerOpen}
        title={t("rules.presets")}
        options={presets.map((preset) => ({ value: preset.guid, label: preset.name }))}
        selected={activePreset ? [activePreset.guid] : []}
        onSelect={(guid) => {
          setPresetPickerOpen(false);
          if (guid !== activePreset?.guid) switchPreset.mutate(guid);
        }}
        onClose={() => setPresetPickerOpen(false)}
      />
      <OptionSheet
        visible={cameraPickerOpen}
        title={t("scan.options.camera")}
        options={camera.devices.map((d, index) => ({ value: d.id, label: cameraLabel(index) }))}
        selected={device ? [device.id] : []}
        onSelect={(id) => {
          setCameraPickerOpen(false);
          camera.select(id);
        }}
        onClose={() => setCameraPickerOpen(false)}
      />
      <OptionSheet
        visible={foilTypePickerOpen}
        title={t("scan.options.foilType")}
        options={[
          { value: NOT_FOIL_OPTION, label: t("scan.options.notFoil") },
          ...foilTypes.map((foilType) => ({ value: foilType, label: foilType })),
        ]}
        selected={[session.forcedFoilType ?? NOT_FOIL_OPTION]}
        onSelect={(value) => {
          setFoilTypePickerOpen(false);
          session.setForcedFoilType(value === NOT_FOIL_OPTION ? null : value);
        }}
        onClose={() => setFoilTypePickerOpen(false)}
      />
      <OptionSheet
        visible={setPickerOpen}
        title={t("scan.options.set")}
        searchPlaceholder={t("scan.options.searchSets")}
        maxVisibleOptions={CARD_SET_PICKER_LIMIT}
        options={[
          { value: ANY_SET_OPTION, label: t("scan.options.anySet") },
          ...(cardSets ?? []).map((cardSet) => ({ value: cardSet.code, label: cardSet.name })),
        ]}
        selected={[session.forcedSetCode ?? ANY_SET_OPTION]}
        onSelect={(value) => {
          setSetPickerOpen(false);
          session.setForcedSetCode(value === ANY_SET_OPTION ? null : value);
        }}
        onClose={() => setSetPickerOpen(false)}
      />
      <SessionScansSheet
        visible={sessionOpen}
        entries={session.feed}
        collectionGuid={collection?.guid ?? null}
        onClose={() => setSessionOpen(false)}
      />
    </View>
  );
}
