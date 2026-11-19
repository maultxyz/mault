import { usePiRebootAlert } from "@/hooks/alerts/use-pi-reboot-alert";
import type { PiUpdateControls } from "@/lib/interfaces/pi-update";
import common from "@/locales/en/common.json";
import type { PiUpdateStatus } from "@magic-vault/shared";
import { render, renderHook, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";

const i18n = createInstance();

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: "en",
    resources: { en: { common } },
    interpolation: { escapeValue: false },
  });
});

function wrapper({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

function controls(
  status: Partial<PiUpdateStatus> | null,
  busy = false,
): PiUpdateControls {
  return {
    status: status && {
      state: { phase: "idle", startedAt: null, message: null },
      available: false,
      installedVersion: "1.0.210",
      latestVersion: "1.0.210",
      rebootRequired: false,
      bootId: "boot-1",
      ...status,
    },
    error: null,
    busy,
    start: async () => {},
  };
}

function alertFor(update: PiUpdateControls) {
  return renderHook(() => usePiRebootAlert(update), { wrapper }).result
    .current;
}

describe("usePiRebootAlert", () => {
  it("stays hidden until the board needs a restart", () => {
    expect(alertFor(controls(null))).toBeNull();
    expect(alertFor(controls({ rebootRequired: false }))).toBeNull();
  });

  it("asks admins to restart with the command, once per boot", () => {
    const alert = alertFor(controls({ rebootRequired: true }));
    expect(alert?.id).toBe("pi-reboot-required-boot-1");
    expect(alert?.severity).toBe("warning");
    render(<>{alert?.message}</>, { wrapper });
    expect(screen.getByText(common.piReboot.banner)).toBeInTheDocument();
    expect(screen.getByText("sudo reboot")).toBeInTheDocument();
    expect(
      alertFor(controls({ rebootRequired: true, bootId: "boot-2" }))?.id,
    ).toBe("pi-reboot-required-boot-2");
  });

  it("waits while a Mault update is running", () => {
    expect(alertFor(controls({ rebootRequired: true }, true))).toBeNull();
  });
});
