import { useQuery } from "@tanstack/react-query";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { router, useIsFocused } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  binSetMode,
  CARD_CONDITIONS,
  collectionGameLabel,
  isCardCondition,
  listScannerControlActions,
} from "@magic-vault/shared";
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
import { useScanTarget } from "@/features/collections/api/use-scan-target";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { usePresetPicker } from "@/features/rules/api/use-preset-picker";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { useLiveCorners } from "@/features/scanner/api/use-live-corners";
import { useLiveFrameSource } from "@/features/scanner/api/use-live-frame-source";
import { useScannerQrWatcher } from "@/features/scanner/api/use-scanner-qr-watcher";
import { useCameraChoice } from "@/features/scanner/api/use-camera-choice";
import { useCameraTorch } from "@/features/scanner/api/use-camera-torch";
import { TorchBrightness } from "@/features/scanner/components/torch-brightness";
import { TorchToggle } from "@/features/scanner/components/torch-toggle";
import { useScanSession } from "@/features/scanner/api/use-scan-session";
import { useScanResultAnnouncements } from "@/features/scanner/api/use-scan-result-announcements";
import { CameraChip } from "@/features/scanner/components/camera-chip";
import { BinBadge } from "@/features/scanner/components/bin-badge";
import { CameraNotice } from "@/features/scanner/components/camera-notice";
import { DetectedOutline } from "@/features/scanner/components/detected-outline";
import { ScanOptionsSheet } from "@/features/scanner/components/scan-options-sheet";
import { ScanRemovalQueueSheet } from "@/features/scanner/components/scan-removal-queue-sheet";
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
  CAPTURE_TARGET_RESOLUTION,
  CARD_SET_PICKER_LIMIT,
  LIVE_DETECTION_PAUSED_PHASES,
  NOT_FOIL_OPTION,
  PAUSE_TONES,
  RUNNING_PHASES,
  QUIET_SCANNER_PHASES,
  SCAN_REMOVAL_NOTICE_TONES,
} from "@/lib/constants/scanner";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { SHUTTER_SIZE } from "@/lib/constants/ui";
import { SCANNER_QR_REPEAT_MS } from "@/lib/constants/phone-camera";
import { useCameraMountReady } from "@/hooks/use-camera-mount-ready";

export default function ScanScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const focused = useIsFocused();
  const cameraMounted = useCameraMountReady(focused);
  const appState = useAppState();
  const sorter = useSorter();
  const orgId = useActiveOrgId();
  const { collection, collections, setScanTargetGuid } = useScanTarget();
  const foilTypes = collection?.game?.foilTypes ?? [];
  const { sets: presets, activeSet } = useRulesData();
  const activePreset = activeSet?.isActive ? activeSet : null;
  const activePresetMode = binSetMode(activePreset);
  const presetPicker = usePresetPicker();
  const presetLabel =
    presetPicker.label && activePresetMode !== "rules"
      ? `${presetPicker.label} · ${t(`rules.modes.${activePresetMode}.title`)}`
      : presetPicker.label;
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const [presetPickerOpen, setPresetPickerOpen] = useState(false);
  const [cameraPickerOpen, setCameraPickerOpen] = useState(false);
  const [foilTypePickerOpen, setFoilTypePickerOpen] = useState(false);
  const [setPickerOpen, setSetPickerOpen] = useState(false);
  const [conditionPickerOpen, setConditionPickerOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const { data: binSets } = useQuery(binSetsQueryOptions(orgId));
  const permission = useCameraPermission();
  const camera = useCameraChoice();
  const device = camera.device;
  const photoOutput = usePhotoOutput({
    targetResolution: CAPTURE_TARGET_RESOLUTION,
    qualityPrioritization: "speed",
  });
  const capture = useCallback(() => captureFrame(photoOutput), [photoOutput]);
  const session = useScanSession({ capture });
  useScanResultAnnouncements(session.feed);
  const { data: cardSets } = useQuery({
    ...cardSetsQueryOptions(collection?.guid ?? null),
    enabled: !!collection?.guid && (setPickerOpen || session.forcedSetCodes.length > 0),
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
  const forcedSetName =
    session.forcedSetCodes.length === 0
      ? t("scan.options.anySet")
      : session.forcedSetCodes.length === 1
        ? (cardSets?.find((cardSet) => cardSet.code === session.forcedSetCodes[0])?.name ??
          session.forcedSetCodes[0].toUpperCase())
        : t("scan.options.setCount", { count: session.forcedSetCodes.length });
  const controlCardDescription = session.controlCardNotice
    ? listScannerControlActions(session.controlCardNotice.command, {
        collectionName: (guid) => collections.find((c) => c.guid === guid)?.name ?? guid,
        presetName: (guid) => binSets?.find((binSet) => binSet.guid === guid)?.name ?? guid,
        setName: (code) => cardSets?.find((cardSet) => cardSet.code === code)?.name ?? code.toUpperCase(),
        conditionName: (condition) => t(`cardDetail.conditions.${condition}`),
      })
        .map((action) => t(`scan.controlCards.actions.${action.key}`, action.values))
        .join(", ")
    : "";
  const working = RUNNING_PHASES.includes(session.phase);
  const cameraRef = useRef<CameraRef>(null);
  const torch = useCameraTorch(device, cameraRef);
  const { liveFrameOutput, grabLiveFrame } = useLiveFrameSource(cameraRef);
  const liveCorners = useLiveCorners(
    grabLiveFrame,
    cameraMounted && appState === "active" && !!device && permission.hasPermission && !session.modelError,
    LIVE_DETECTION_PAUSED_PHASES.includes(session.phase),
    session.trackLiveCorners,
  );
  const lastQrLinkRef = useRef<{ linkKey: string; seenAt: number } | null>(null);
  const scannerQr = useScannerQrWatcher({
    active:
      cameraMounted &&
      appState === "active" &&
      !!device &&
      permission.hasPermission &&
      !working &&
      !LIVE_DETECTION_PAUSED_PHASES.includes(session.phase),
    grabLiveFrame,
    onQrLink: (qrLink) => {
      const linkKey = JSON.stringify(qrLink);
      const last = lastQrLinkRef.current;
      if (last && last.linkKey === linkKey && Date.now() - last.seenAt < SCANNER_QR_REPEAT_MS) return;
      lastQrLinkRef.current = { linkKey, seenAt: Date.now() };
      if (session.isRunning) session.pause();
      if (qrLink.kind === "share-link") {
        router.push({ pathname: "/shared-link", params: { ...qrLink.shareLink } });
      } else {
        router.push({ pathname: "/desktop-camera/[guid]", params: { guid: qrLink.collectionGuid } });
      }
    },
  });
  const lastBin = sorter.isReady ? undefined : session.feed[0]?.binNumber;
  const [sessionOpen, setSessionOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [removalQueueOpen, setRemovalQueueOpen] = useState(false);
  const [removalBinPickerOpen, setRemovalBinPickerOpen] = useState(false);
  const removalBinOptions = session.binConfigs
    .filter((bin) => !bin.isDisabled)
    .sort((first, second) => first.binNumber - second.binNumber)
    .map((bin) => ({
      value: String(bin.binNumber),
      label: bin.isCatchAll
        ? t("scan.removal.catchAllBinOption", { number: bin.binNumber })
        : t("scan.removal.binOption", { number: bin.binNumber }),
    }));
  const removalBinLabel = removalBinOptions.find(
    (option) => option.value === String(session.removal.removalBinNumber),
  )?.label;
  const showRemovalChip = session.removal.isActive || session.removal.entries.length > 0;
  const removalNotice = session.removal.notice;
  const changeRemoveMode = (isRemoveMode: boolean) => {
    session.removal.setIsEnabled(isRemoveMode);
    if (isRemoveMode) session.setHandScan(true);
  };
  const showPhaseChip = !QUIET_SCANNER_PHASES.includes(session.phase);
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
  ) : presetPicker.isError ? (
    <CameraNotice tone="destructive" title={t("rules.activateFailed")} />
  ) : sorter.notice ? (
    <CameraNotice
      tone="warning"
      title={t("sorter.restarted.title")}
      description={t(`sorter.resetReasons.${sorter.notice.reason}`)}
      actionLabel={t("common.dismiss")}
      onAction={sorter.dismissNotice}
    />
  ) : session.controlCardNotice ? (
    <CameraNotice
      key={session.controlCardNotice.noticeId}
      tone="success"
      title={t("scan.controlCards.applied")}
      description={controlCardDescription}
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
  ) : removalNotice ? (
    <CameraNotice
      key={removalNotice.noticeId}
      tone={SCAN_REMOVAL_NOTICE_TONES[removalNotice.kind]}
      title={t(`scan.removal.notice.${removalNotice.kind}`, {
        name: removalNotice.cardName ?? "",
        count: removalNotice.removedCount ?? 0,
      })}
    />
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.camera }}>
      {device ? (
        cameraMounted ? (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={cameraMounted && appState === "active"}
            outputs={[photoOutput, ...(liveFrameOutput ? [liveFrameOutput] : []), ...scannerQr.outputs]}
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
      {device ? (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={t("scan.cameraPreview")}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {device ? <DetectedOutline corners={liveCorners} color={colors.primary} /> : null}

      <View
        pointerEvents="box-none"
        style={{ paddingTop: SPACING.md, paddingHorizontal: SCREEN_GUTTER, gap: SPACING.md }}
      >
        <View pointerEvents="box-none" style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
          <View style={{ flex: 1, minWidth: 0, flexDirection: "row" }}>
            <CameraChip
              icon="collections"
              label={collection ? t("scan.scanningInto", { name: collection.name }) : t("scan.chooseCollection")}
              onPress={session.isRunning ? undefined : () => setCollectionPickerOpen(true)}
            />
          </View>
          <TorchToggle torch={torch} />
          <IconButton
            icon="more"
            variant="camera"
            size={36}
            accessibilityLabel={t("scan.options.title")}
            onPress={() => setOptionsOpen(true)}
          />
        </View>
        <TorchBrightness torch={torch} />
        {showPhaseChip || session.sessionCount > 0 ? (
          <View pointerEvents="box-none" style={{ flexDirection: "row", gap: SPACING.sm }}>
            {showPhaseChip ? (
              <View style={{ flexShrink: 1, minWidth: 0 }}>
                <CameraChip dotColor={phaseColor} label={t(`scan.phase.${session.phase}`)} />
              </View>
            ) : null}
            {session.sessionCount > 0 ? (
              <CameraChip
                icon="check"
                label={t("scan.sessionChip", { count: session.sessionCount })}
                onPress={() => setSessionOpen(true)}
              />
            ) : null}
          </View>
        ) : null}
        {showRemovalChip && collection ? (
          <View pointerEvents="box-none" style={{ flexDirection: "row" }}>
            <CameraChip
              icon="trash"
              dotColor={session.removal.isActive ? colors.destructive : undefined}
              label={t("scan.removal.chip", { collection: collection.name, count: session.removal.entries.length })}
              onPress={() => setRemovalQueueOpen(true)}
            />
          </View>
        ) : null}
        {session.removal.isEnabled && sorter.isConnected && removalBinLabel ? (
          <View pointerEvents="box-none" style={{ flexDirection: "row" }}>
            <CameraChip
              icon="sorter"
              label={t("scan.removal.binChip", { bin: removalBinLabel })}
              onPress={() => setRemovalBinPickerOpen(true)}
            />
          </View>
        ) : null}
        {lastBin != null && !session.removal.isActive ? (
          <View pointerEvents="none" style={{ alignItems: "center" }}>
            <BinBadge key={session.feed[0]?.scanId} binNumber={lastBin} />
          </View>
        ) : null}
      </View>

      <SafeAreaView
        edges={["bottom"]}
        pointerEvents="box-none"
        style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
      >
        <View
          pointerEvents="box-none"
          style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.lg, gap: SPACING.md }}
        >
          {notice}
          <View pointerEvents="box-none" style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
            <View pointerEvents="box-none" style={{ flex: 1, alignItems: "flex-start" }}>
              {collection && !sorter.isConnected && !session.isRunning ? (
                <IconButton
                  icon="multiCard"
                  variant="camera"
                  size={SHUTTER_SIZE - SPACING.sm}
                  accessibilityLabel={t("batchScan.open")}
                  onPress={() =>
                    router.push({
                      pathname: "/batch-scan",
                      params: { mode: session.removal.isEnabled ? "remove" : "add" },
                    })
                  }
                />
              ) : null}
            </View>
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
            <View pointerEvents="box-none" style={{ flex: 1, alignItems: "flex-end" }}>
              {sorter.isConnected ? (
                <IconButton
                  icon="adjust"
                  variant="camera"
                  size={SHUTTER_SIZE - SPACING.sm}
                  accessibilityLabel={t("scan.controls.open")}
                  onPress={() => setControlsOpen(true)}
                />
              ) : null}
            </View>
          </View>
        </View>
      </SafeAreaView>
      <ScanOptionsSheet
        visible={optionsOpen}
        running={session.isRunning}
        autoFeed={session.autoFeed}
        onAutoFeedChange={session.setAutoFeed}
        allowDuplicates={session.allowDuplicates}
        onAllowDuplicatesChange={session.setAllowDuplicates}
        handScan={session.handScan}
        onHandScanChange={session.setHandScan}
        removeMode={session.removal.isEnabled}
        onRemoveModeChange={changeRemoveMode}
        presetName={presetLabel}
        showPreset={!!collection?.game && presets.length > 0}
        cameraName={selectedCameraIndex >= 0 ? cameraLabel(selectedCameraIndex) : null}
        showCamera={camera.devices.length > 1}
        foilTypeName={session.forcedFoilType ?? t("scan.options.notFoil")}
        showFoilType={foilTypes.length > 0}
        setName={forcedSetName}
        conditionName={t(`cardDetail.conditions.${session.scanCondition}`)}
        onChooseCondition={() => {
          setOptionsOpen(false);
          setConditionPickerOpen(true);
        }}
        onChooseFoilType={() => {
          setOptionsOpen(false);
          setFoilTypePickerOpen(true);
        }}
        onChooseSet={() => {
          setOptionsOpen(false);
          setSetPickerOpen(true);
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
        visible={removalBinPickerOpen}
        title={t("scan.removal.binPickerTitle")}
        options={removalBinOptions}
        selected={session.removal.removalBinNumber != null ? [String(session.removal.removalBinNumber)] : []}
        onSelect={(binNumber) => {
          setRemovalBinPickerOpen(false);
          session.removal.setRemovalBinNumber(Number(binNumber));
        }}
        onClose={() => setRemovalBinPickerOpen(false)}
      />
      <OptionSheet
        visible={collectionPickerOpen}
        title={t("scan.chooseCollection")}
        options={collections.map((c) => ({ value: c.guid, label: c.name, badge: collectionGameLabel(c) }))}
        selected={collection ? [collection.guid] : []}
        onSelect={(guid) => {
          setCollectionPickerOpen(false);
          setScanTargetGuid(guid);
        }}
        onClose={() => setCollectionPickerOpen(false)}
      />
      <OptionSheet
        visible={presetPickerOpen}
        title={t("rules.presets")}
        options={presetPicker.options}
        selected={presetPicker.selected}
        onSelect={(value) => {
          setPresetPickerOpen(false);
          presetPicker.choose(value);
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
        selected={session.forcedSetCodes.length > 0 ? session.forcedSetCodes : [ANY_SET_OPTION]}
        onSelect={(value) => {
          if (value === ANY_SET_OPTION) {
            setSetPickerOpen(false);
            session.setForcedSetCodes([]);
            return;
          }
          session.setForcedSetCodes(
            session.forcedSetCodes.includes(value)
              ? session.forcedSetCodes.filter((code) => code !== value)
              : [...session.forcedSetCodes, value],
          );
        }}
        onClose={() => setSetPickerOpen(false)}
      />
      <OptionSheet
        visible={conditionPickerOpen}
        title={t("scan.options.condition")}
        options={CARD_CONDITIONS.map((condition) => ({
          value: condition,
          label: t(`cardDetail.conditions.${condition}`),
        }))}
        selected={[session.scanCondition]}
        onSelect={(value) => {
          setConditionPickerOpen(false);
          if (isCardCondition(value)) session.setScanCondition(value);
        }}
        onClose={() => setConditionPickerOpen(false)}
      />
      <ScanRemovalQueueSheet
        visible={removalQueueOpen}
        removal={session.removal}
        collectionName={collection?.name ?? ""}
        onClose={() => setRemovalQueueOpen(false)}
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
