import SelfHostPage from "@/app/routes/self-host";
import { visibleSelfHostSections } from "@/features/self-host/lib/sections";
import {
  DEFAULT_SELF_HOST_SETUP,
  SELF_HOST_SECTIONS,
} from "@/lib/constants/self-host";
import type { SelfHostAuth, SelfHostHost } from "@/lib/interfaces/self-host";
import common from "@/locales/en/common.json";
import de from "@/locales/de/selfhost.json";
import en from "@/locales/en/selfhost.json";
import fr from "@/locales/fr/selfhost.json";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { BrowserRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const i18n = createInstance();
beforeAll(async () => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    })),
  });
  await i18n.init({
    lng: "en",
    resources: { en: { selfhost: en, common } },
    defaultNS: "common",
    interpolation: { escapeValue: false },
  });
});
beforeEach(() => window.history.replaceState(null, "", "/self-host"));
function renderGuide(url: string) {
  window.history.replaceState(null, "", url);
  return render(
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <SelfHostPage />
      </BrowserRouter>
    </I18nextProvider>,
  );
}
function radio(name: string) {
  return screen.getByRole("radio", { name: new RegExp(`^${name}`) });
}

describe("Pi/Linux self-host guide", () => {
  it("opens a shared Pi URL with local accounts and only native installation steps", () => {
    const { container } = renderGuide("/self-host?host=pi&auth=neon");
    expect(radio("Pi/Linux")).toHaveAttribute("aria-checked", "true");
    expect(radio("Built-in")).toHaveAttribute("aria-checked", "true");
    expect(radio("Neon")).toBeDisabled();
    expect(screen.getByText(en.setup.auth.piNote)).toBeInTheDocument();
    expect(
      [...container.querySelectorAll("section[id]")].map((s) => s.id),
    ).toEqual([
      "setup",
      "requirements",
      "piHardware",
      "piInstall",
      "piOpen",
      "piPrices",
      "piMaintain",
    ]);
    expect(container.textContent).toContain("mault-pi.img.xz");
    expect(container.textContent).toContain("install.sh | sudo bash");
    expect(container.textContent).toContain("sudo mault update");
    expect(container.textContent).toContain("http://mault.local");
    expect(container.textContent).toContain("Mault includes BlueZ");
    expect(container.textContent).not.toContain("git clone");
    expect(container.textContent).toContain("Open Connect Bluetooth");
    expect(container.textContent).not.toContain("docker compose up");
    expect(container.textContent).not.toContain("db:migrate");
    expect(screen.getByRole("link", { name: /Hardware/ })).toHaveAttribute(
      "href",
      "#piHardware",
    );
  });
  it("switches from Neon to Pi, updates the bookmark and preserves unrelated URL state", () => {
    renderGuide("/self-host?host=coolify&auth=neon&source=docs#setup");
    fireEvent.click(radio("Pi/Linux"));
    const params = new URLSearchParams(window.location.search);
    expect(params.get("host")).toBe("pi");
    expect(params.has("auth")).toBe(false);
    expect(params.get("source")).toBe("docs");
    expect(window.location.hash).toBe("#setup");
    expect(radio("Neon")).toBeDisabled();
    fireEvent.click(radio("Coolify"));
    expect(radio("Neon")).toBeEnabled();
    fireEvent.click(radio("Neon"));
    expect(new URLSearchParams(window.location.search).get("auth")).toBe(
      "neon",
    );
    expect(
      screen.getByRole("heading", { name: "Set up Neon" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: en.sections.piInstall.title }),
    ).not.toBeInTheDocument();
  });
  it("keeps checklist progress when switching hosting options", () => {
    const { container } = renderGuide("/self-host?host=pi");
    const check = within(
      container.querySelector("#piInstall")! as HTMLElement,
    ).getAllByRole("checkbox")[0];
    fireEvent.click(check);
    expect(check).toHaveAttribute("aria-checked", "true");
    fireEvent.click(radio("Docker Compose"));
    fireEvent.click(radio("Pi/Linux"));
    expect(
      within(
        container.querySelector("#piInstall")! as HTMLElement,
      ).getAllByRole("checkbox")[0],
    ).toHaveAttribute("aria-checked", "true");
  });
  it("reveals board choices only for GPIO and saves hardware choices in the URL", () => {
    const { container } = renderGuide("/self-host?host=pi&source=docs#setup");
    expect(radio("ESP32 / Arduino")).toHaveAttribute("aria-checked", "true");
    expect(
      screen.queryByRole("radiogroup", { name: en.setup.board.label }),
    ).not.toBeInTheDocument();
    fireEvent.click(radio("Pi controlled with GPIO pins"));
    expect(radio("Raspberry Pi")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(radio("Orange Pi Zero 4"));
    expect(new URLSearchParams(window.location.search).get("board")).toBe(
      "orange-pi-zero4",
    );
    expect(container.querySelector("#piInstall")?.textContent).not.toContain(
      "mault-pi.img.xz",
    );
    expect(container.querySelector("#piInstall")?.textContent).toContain(
      "install.sh | sudo bash",
    );
    fireEvent.click(radio("ESP32 / Arduino"));
    expect(
      screen.queryByRole("radiogroup", { name: en.setup.board.label }),
    ).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).has("board")).toBe(
      false,
    );
    expect(new URLSearchParams(window.location.search).get("source")).toBe(
      "docs",
    );
    expect(window.location.hash).toBe("#setup");
    expect(container.querySelector("#piInstall")?.textContent).toContain(
      "mault-pi.img.xz",
    );
    fireEvent.click(radio("Docker Compose"));
    expect(
      screen.queryByRole("radiogroup", { name: en.setup.sorter.label }),
    ).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).has("sorter")).toBe(
      false,
    );
  });
  it.each([
    ["raspberry-pi", "Raspberry Pi", "Orange Pi Zero 4"],
    ["orange-pi-zero4", "Orange Pi Zero 4", "Raspberry Pi"],
  ])(
    "restores the %s GPIO guide from a shared URL",
    (board, title, otherBoard) => {
      const { container } = renderGuide(
        `/self-host?host=pi&sorter=gpio&board=${board}`,
      );
      expect(radio("Pi controlled with GPIO pins")).toHaveAttribute(
        "aria-checked",
        "true",
      );
      expect(radio(title)).toHaveAttribute("aria-checked", "true");
      const hardware = container.querySelector("#piHardware")!;
      expect(hardware.textContent).toContain(title);
      expect(hardware.textContent).not.toContain(otherBoard);
      expect(hardware.textContent).not.toContain("Host Bluetooth");
      const install = container.querySelector("#piInstall")!;
      if (board === "raspberry-pi") {
        expect(install.textContent).toContain(
          "flash it to the microSD card with Raspberry Pi Imager",
        );
      } else {
        expect(install.textContent).not.toContain("mault-pi.img.xz");
      }
      expect(install.textContent).not.toContain("PI_SORTER=");
      expect(install.textContent).toContain("install.sh | sudo bash");
      expect(
        within(install as HTMLElement).getAllByRole("checkbox"),
      ).toHaveLength(board === "raspberry-pi" ? 5 : 3);
    },
  );
  it("uses the external controller default for invalid hardware URL choices", () => {
    renderGuide("/self-host?host=pi&sorter=invalid&board=invalid");
    expect(radio("ESP32 / Arduino")).toHaveAttribute("aria-checked", "true");
    expect(
      screen.queryByRole("radiogroup", { name: en.setup.board.label }),
    ).not.toBeInTheDocument();
  });
  it("explains user-agent configuration, daily scheduling and automatic startup", () => {
    const { container } = renderGuide("/self-host?host=pi");
    expect(container.querySelector("#piInstall")?.textContent).toContain(
      "including a generated CARD_API_USER_AGENT",
    );
    expect(
      screen.getByText(
        "Sign up on your own installation. The first account becomes platform admin with a Home organization.",
      ),
    ).toBeInTheDocument();
    const prices = container.querySelector("#piPrices")!;
    expect(prices.textContent).toContain("Prices sync automatically every day");
    expect(prices.textContent).toContain("sudo mault prices");
    expect(prices.textContent).toContain("mault-prices.timer");
    const maintenance = container.querySelector("#piMaintain")!;
    expect(maintenance.textContent).toContain(
      "starts automatically when the board powers on or reboots",
    );
    expect(
      maintenance.textContent!.indexOf(
        en.sections.piMaintain.steps.automatic.text,
      ),
    ).toBeLessThan(
      maintenance.textContent!.indexOf(en.sections.piMaintain.steps.start.text),
    );
    expect(maintenance.textContent).not.toContain("--headless");
  });
  it("falls back to the existing defaults for invalid URL choices", () => {
    renderGuide("/self-host?host=unknown&auth=unknown");
    expect(radio("Docker Compose")).toHaveAttribute("aria-checked", "true");
    expect(radio("Built-in")).toHaveAttribute("aria-checked", "true");
  });
});
describe("existing hosting paths", () => {
  for (const host of ["compose", "coolify"] as SelfHostHost[])
    for (const auth of ["local", "neon"] as SelfHostAuth[]) {
      it(`preserves ${host}/${auth} sections`, () => {
        expect(
          visibleSelfHostSections({
            ...DEFAULT_SELF_HOST_SETUP,
            host,
            auth,
          }).map((s) => s.key),
        ).toEqual([
          "requirements",
          ...(host === "compose" ? ["configure"] : []),
          ...(auth === "neon" ? ["neon"] : []),
          host === "compose" ? "start" : "coolify",
          "firstRun",
          "prices",
          "optional",
          "maintain",
        ]);
      });
    }
});
describe("guide translations", () => {
  for (const [language, resource] of Object.entries({ en, de, fr }))
    it(`has translated headings, checklist text and notes in ${language}`, () => {
      const translations = createInstance();
      translations.init({
        lng: language,
        resources: { [language]: { selfhost: resource } },
        initAsync: false,
      });
      for (const [group, values] of Object.entries({
        sorter: ["gpio", "usb"],
        board: ["raspberry-pi", "orange-pi-zero4"],
      })) {
        expect(translations.exists(`selfhost:setup.${group}.label`)).toBe(true);
        for (const value of values)
          for (const field of ["title", "description"])
            expect(
              translations.exists(`selfhost:setup.${group}.${value}.${field}`),
            ).toBe(true);
      }
      for (const section of SELF_HOST_SECTIONS) {
        for (const key of ["label", "title", "description"])
          expect(
            translations.exists(`selfhost:sections.${section.key}.${key}`),
          ).toBe(true);
        for (const step of section.steps) {
          expect(
            translations.exists(
              `selfhost:sections.${section.key}.steps.${step.key}.text`,
            ),
          ).toBe(true);
          if (step.hasNote)
            expect(
              translations.exists(
                `selfhost:sections.${section.key}.steps.${step.key}.note`,
              ),
            ).toBe(true);
        }
      }
    });
});
