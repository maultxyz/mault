import {
  findScannerControlCommandProblem,
  type ScannerControlCommand,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { describeScannerControlCommand } from "@/features/control-cards/lib/describe-control-command";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useStationToast } from "@/features/scanner/api/use-station-toast";

export function useApplyScannerControlCode(
  setAllowDuplicates: (allowDuplicates: boolean) => void,
) {
  const { t } = useTranslation("scanner");
  const { t: tCards } = useTranslation("cards");
  const toast = useStationToast();
  const { activeOrg } = useOrg();
  const { collections, activeCollection, activateCollection } =
    useCollections();
  const { activateSet } = useBinConfigs();
  const { data: presets = [] } = useQuery({
    ...binsQueryOptions,
    enabled: !!activeOrg,
  });
  const {
    pause,
    sendCatchAllBin,
    setAutoFeed,
    setForceFoilType,
    setForceSetCode,
    setForceSetCodeAfterCollectionSwitch,
    setScanCondition,
  } = useScannedCards();

  return useCallback(
    async (command: ScannerControlCommand | null) => {
      const problem = command
        ? findScannerControlCommandProblem(command, {
            collections,
            presets,
            activeCollectionGuid: activeCollection?.guid,
          })
        : "unreadable";
      if (!command || problem) {
        pause();
        sendCatchAllBin();
        toast.error(t("controlCards.rejected.title"), {
          description: t(`controlCards.problems.${problem ?? "unreadable"}`),
        });
        return;
      }

      if (command.pauseScanner) pause();
      if (command.autoFeed !== undefined) setAutoFeed(command.autoFeed);
      if (command.allowDuplicates !== undefined) {
        setAllowDuplicates(command.allowDuplicates);
      }
      if (command.condition) setScanCondition(command.condition);
      if (command.forcedFoilType !== undefined) {
        setForceFoilType(command.forcedFoilType);
      }
      const switchesCollection =
        !!command.collectionGuid &&
        command.collectionGuid !== activeCollection?.guid;
      if (command.forcedSetCode !== undefined) {
        if (switchesCollection && activeCollection) {
          setForceSetCodeAfterCollectionSwitch(command.forcedSetCode);
        } else {
          setForceSetCode(command.forcedSetCode);
        }
      }
      if (switchesCollection && command.collectionGuid) {
        void activateCollection(command.collectionGuid);
      }
      const preset = presets.find((set) => set.guid === command.presetGuid);
      if (preset && !preset.isActive) {
        const activated = await activateSet(preset.guid).catch(() => false);
        if (!activated) {
          pause();
          sendCatchAllBin();
          return;
        }
      }

      sendCatchAllBin();
      const actionLines = describeScannerControlCommand(
        command,
        {
          collectionName: (guid) =>
            collections.find((collection) => collection.guid === guid)
              ?.name ?? guid,
          presetName: (guid) =>
            presets.find((set) => set.guid === guid)?.name ?? guid,
          setName: (setCode) => setCode.toUpperCase(),
          conditionName: (condition) =>
            tCards(`condition.names.${condition}`),
        },
        t,
      );
      toast.success(t("controlCards.applied"), {
        description: actionLines.join(", "),
      });
    },
    [
      activateCollection,
      activateSet,
      activeCollection,
      collections,
      pause,
      presets,
      sendCatchAllBin,
      setAllowDuplicates,
      setAutoFeed,
      setForceFoilType,
      setForceSetCode,
      setForceSetCodeAfterCollectionSwitch,
      setScanCondition,
      t,
      tCards,
      toast,
    ],
  );
}
