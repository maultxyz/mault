import {
  DEFAULT_SELF_HOST_SETUP,
  SELF_HOST_AUTH_OPTIONS,
  SELF_HOST_BOARD_HOSTS,
  SELF_HOST_BOARD_OPTIONS,
  SELF_HOST_SORTER_OPTIONS,
  SELF_HOST_HOST_OPTIONS,
  SELF_HOST_RECOMMENDED_AUTH,
  SELF_HOST_SETUP_PARAMS,
} from "@/lib/constants/self-host";
import type {
  SelfHostHost,
  SelfHostSetupState,
  SelfHostSetupValue,
} from "@/lib/interfaces/self-host";
import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function isBoardHost(host: SelfHostHost): boolean {
  return SELF_HOST_BOARD_HOSTS.includes(host);
}

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
    auth: isBoardHost(host?.value ?? DEFAULT_SELF_HOST_SETUP.host)
      ? "local"
      : (auth?.value ?? SELF_HOST_RECOMMENDED_AUTH),
  };
}

function writeSelfHostSetup(search: string, setup: SelfHostSetupState): string {
  const params = new URLSearchParams(search);
  const keys = Object.keys(
    SELF_HOST_SETUP_PARAMS,
  ) as (keyof SelfHostSetupState)[];
  for (const key of keys) {
    if (
      (key === "auth"
        ? setup.auth === SELF_HOST_RECOMMENDED_AUTH
        : setup[key] === DEFAULT_SELF_HOST_SETUP[key]) ||
      ((key === "sorter" || key === "board") && !isBoardHost(setup.host)) ||
      (key === "auth" && isBoardHost(setup.host)) ||
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
      const current = parseSelfHostSetup(window.location.search);
      const next = { ...current, ...patch };
      if (isBoardHost(next.host)) next.auth = "local";
      else if (isBoardHost(current.host) && !patch.auth) {
        next.auth = SELF_HOST_RECOMMENDED_AUTH;
      }
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
