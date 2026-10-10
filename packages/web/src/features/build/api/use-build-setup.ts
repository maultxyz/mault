import {
  BOARD_TYPES,
  BUILD_SETUP_PARAMS,
  DEFAULT_BUILD_SETUP,
  ESP32_MOUNT_TYPES,
  MAX_MODULES,
  MIN_MODULES,
} from "@/lib/constants/build";
import type {
  BoardType,
  BuildSetupState,
  BuildSetupValue,
  Esp32MountType,
} from "@/lib/interfaces/build";
import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function clampModuleCount(value: number): number {
  return Math.min(MAX_MODULES, Math.max(MIN_MODULES, Math.round(value)));
}

function parseBuildSetup(search: string): BuildSetupState {
  const params = new URLSearchParams(search);
  const board = params.get(BUILD_SETUP_PARAMS.boardType);
  const mount = params.get(BUILD_SETUP_PARAMS.mountType);
  const modules = Number(params.get(BUILD_SETUP_PARAMS.moduleCount));
  return {
    boardType: BOARD_TYPES.includes(board as BoardType)
      ? (board as BoardType)
      : DEFAULT_BUILD_SETUP.boardType,
    mountType: ESP32_MOUNT_TYPES.includes(mount as Esp32MountType)
      ? (mount as Esp32MountType)
      : DEFAULT_BUILD_SETUP.mountType,
    moduleCount:
      Number.isInteger(modules) &&
      modules >= MIN_MODULES &&
      modules <= MAX_MODULES
        ? modules
        : DEFAULT_BUILD_SETUP.moduleCount,
    usingKit: params.get(BUILD_SETUP_PARAMS.usingKit) === "1",
  };
}

function writeBuildSetup(search: string, setup: BuildSetupState): string {
  const params = new URLSearchParams(search);
  const values: Record<keyof BuildSetupState, string | null> = {
    boardType:
      setup.boardType === DEFAULT_BUILD_SETUP.boardType
        ? null
        : setup.boardType,
    mountType:
      setup.mountType === DEFAULT_BUILD_SETUP.mountType
        ? null
        : setup.mountType,
    moduleCount:
      setup.moduleCount === DEFAULT_BUILD_SETUP.moduleCount
        ? null
        : String(setup.moduleCount),
    usingKit: setup.usingKit ? "1" : null,
  };
  for (const key of Object.keys(values) as (keyof BuildSetupState)[]) {
    const value = values[key];
    if (value === null) params.delete(BUILD_SETUP_PARAMS[key]);
    else params.set(BUILD_SETUP_PARAMS[key], value);
  }
  const next = params.toString();
  return next ? `?${next}` : "";
}

export function useBuildSetup(): BuildSetupValue {
  const { search } = useLocation();
  const navigate = useNavigate();
  const setup = useMemo(() => parseBuildSetup(search), [search]);

  const updateSetup = useCallback(
    (patch: Partial<BuildSetupState>) => {
      const current = parseBuildSetup(window.location.search);
      const next = { ...current, ...patch };
      if (patch.moduleCount !== undefined) {
        next.moduleCount = clampModuleCount(patch.moduleCount);
      }
      navigate(
        {
          search: writeBuildSetup(window.location.search, next),
          hash: window.location.hash,
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [navigate],
  );

  return { ...setup, updateSetup };
}
