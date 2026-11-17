import {
  DEFAULT_SELF_HOST_SETUP,
  SELF_HOST_AUTH_OPTIONS,
  SELF_HOST_BOARD_OPTIONS,
  SELF_HOST_SORTER_OPTIONS,
  SELF_HOST_HOST_OPTIONS,
  SELF_HOST_SETUP_PARAMS,
} from "@/lib/constants/self-host";
import type {
  SelfHostSetupState,
  SelfHostSetupValue,
} from "@/lib/interfaces/self-host";
import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function parseSelfHostSetup(search: string): SelfHostSetupState {
  const params = new URLSearchParams(search);
  const host = SELF_HOST_HOST_OPTIONS.find(
    (option) => option.value === params.get(SELF_HOST_SETUP_PARAMS.host),
  );
  const auth = SELF_HOST_AUTH_OPTIONS.find(
    (option) => option.value === params.get(SELF_HOST_SETUP_PARAMS.auth),
  );
  const sorter = SELF_HOST_SORTER_OPTIONS.find(
    (option) => option.value === params.get(SELF_HOST_SETUP_PARAMS.sorter),
  );
  const board = SELF_HOST_BOARD_OPTIONS.find(
    (option) => option.value === params.get(SELF_HOST_SETUP_PARAMS.board),
  );
  return {
    sorter: sorter?.value ?? DEFAULT_SELF_HOST_SETUP.sorter,
    board: board?.value ?? DEFAULT_SELF_HOST_SETUP.board,
    host: host?.value ?? DEFAULT_SELF_HOST_SETUP.host,
    auth:
      host?.value === "pi"
        ? "local"
        : (auth?.value ?? DEFAULT_SELF_HOST_SETUP.auth),
  };
}

function writeSelfHostSetup(search: string, setup: SelfHostSetupState): string {
  const params = new URLSearchParams(search);
  const keys = Object.keys(
    SELF_HOST_SETUP_PARAMS,
  ) as (keyof SelfHostSetupState)[];
  for (const key of keys) {
    if (
      setup[key] === DEFAULT_SELF_HOST_SETUP[key] ||
      ((key === "sorter" || key === "board") && setup.host !== "pi") ||
      (key === "board" && setup.sorter !== "gpio")
    ) {
      params.delete(SELF_HOST_SETUP_PARAMS[key]);
    } else {
      params.set(SELF_HOST_SETUP_PARAMS[key], setup[key]);
    }
  }
  const next = params.toString();
  return next ? `?${next}` : "";
}

export function useSelfHostSetup(): SelfHostSetupValue {
  const { search } = useLocation();
  const navigate = useNavigate();
  const setup = useMemo(() => parseSelfHostSetup(search), [search]);

  const updateSetup = useCallback(
    (patch: Partial<SelfHostSetupState>) => {
      const next = { ...parseSelfHostSetup(window.location.search), ...patch };
      if (next.host === "pi") next.auth = "local";
      navigate(
        {
          search: writeSelfHostSetup(window.location.search, next),
          hash: window.location.hash,
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [navigate],
  );

  return { ...setup, updateSetup };
}
