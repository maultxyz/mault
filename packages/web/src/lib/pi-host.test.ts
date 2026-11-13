import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadServerVersion } = vi.hoisted(() => ({
  loadServerVersion: vi.fn(),
}));

vi.mock("@/lib/server-version", () => ({ loadServerVersion }));

describe("Pi host version discovery", () => {
  beforeEach(() => {
    vi.resetModules();
    loadServerVersion.mockReset();
  });

  it("preserves built-in sorter discovery alongside firmware release discovery", async () => {
    loadServerVersion.mockResolvedValue({
      version: "1.0.189",
      piHost: true,
      piSorter: true,
      latestFirmwareVersion: "2.11.0",
    });
    const host = await import("./pi-host");
    expect(await host.loadPiHost()).toBe(true);
    expect(host.isPiController()).toBe(true);
    expect(host.isPiHostSettled()).toBe(true);
    await host.loadPiHost();
    expect(loadServerVersion).toHaveBeenCalledTimes(1);
  });

  it("does not assume a hosted USB sorter is built in", async () => {
    loadServerVersion.mockResolvedValue({ version: "1.0.189", piHost: true });
    const host = await import("./pi-host");
    expect(await host.loadPiHost()).toBe(true);
    expect(host.isPiController()).toBe(false);
  });

  it("settles safely when version discovery fails", async () => {
    loadServerVersion.mockResolvedValue(null);
    const host = await import("./pi-host");
    expect(await host.loadPiHost()).toBe(false);
    expect(host.isPiController()).toBe(false);
    expect(host.isPiHostSettled()).toBe(true);
  });
});
