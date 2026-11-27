import { RaspberryPiRow } from "@/features/raspberry-pis/components/raspberry-pi-row";
import type { PiHostSummary, PiScanSessionState } from "@magic-vault/shared";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutate = vi.fn();

vi.mock("@/features/collections/api/use-collections", () => ({
  useCollections: () => ({
    collections: [{ guid: "collection-1", name: "Binder" }],
    activeCollection: { guid: "collection-1", name: "Binder" },
  }),
}));

vi.mock("@/hooks/use-is-mobile", () => ({ useIsMobile: () => false }));

vi.mock("@/features/raspberry-pis/api/use-raspberry-pi-camera", () => ({
  useRaspberryPiCamera: () => ({ frame: null, isUnavailable: false }),
}));

const updateMutate = vi.fn();

vi.mock("@/features/raspberry-pis/api/use-raspberry-pis", () => ({
  useRaspberryPiScan: () => ({ mutate, isPending: false }),
  useRaspberryPiUpdate: () => ({ mutate: updateMutate, isPending: false }),
}));

function scanState(overrides: Partial<PiScanSessionState>): PiScanSessionState {
  return {
    phase: "idle",
    collectionGuid: null,
    message: null,
    cardsScanned: 0,
    stopping: false,
    activity: null,
    current: null,
    lastCard: null,
    startedAt: null,
    pausedMs: 0,
    pausedAt: null,
    autoFeed: true,
    ...overrides,
  };
}

function host(overrides: Partial<PiHostSummary>): PiHostSummary {
  return {
    guid: "pi-1",
    name: "Bench Pi",
    pairedAt: "2026-11-25T00:00:00.000Z",
    sorterDeviceGuid: null,
    update: null,
    lastSeenAt: null,
    connected: true,
    scanState: null,
    ...overrides,
  };
}

describe("RaspberryPiRow", () => {
  beforeEach(() => {
    mutate.mockReset();
    updateMutate.mockReset();
  });

  it("starts a scan with the chosen options when the Pi is ready", async () => {
    render(<RaspberryPiRow host={host({})} canManage={false} onRemove={vi.fn()} onRename={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("raspberryPis.status.idle");
    fireEvent.click(screen.getByRole("button", { name: "raspberryPis.start" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("raspberryPis.setsLabel"), {
      target: { value: "mkm, otj mkm" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "raspberryPis.start" }));
    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        {
          kind: "start",
          body: {
            collectionGuid: "collection-1",
            condition: "NM",
            foilType: null,
            preferredSetCodes: ["MKM", "OTJ"],
            autoFeed: true,
            allowDuplicates: true,
          },
        },
        expect.anything(),
      ),
    );
    expect(screen.queryByRole("button", { name: "raspberryPis.remove" })).toBeNull();
  });

  it("feeds one card at a time and toggles auto-feed while scanning", () => {
    render(
      <RaspberryPiRow
        host={host({ scanState: scanState({ phase: "running", autoFeed: false }) })}
        canManage={false}
        onRemove={vi.fn()}
        onRename={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "raspberryPis.feed" }));
    fireEvent.click(screen.getByRole("switch", { name: "raspberryPis.autoFeedLabel" }));
    expect(mutate.mock.calls.map(([request]) => request)).toEqual([
      { kind: "action", action: "feed" },
      { kind: "settings", body: { autoFeed: true } },
    ]);
  });

  it("offers pause, stop and emergency stop while scanning", () => {
    render(
      <RaspberryPiRow
        host={host({ scanState: scanState({ phase: "running", cardsScanned: 3, collectionGuid: "collection-1" }) })}
        canManage
        onRemove={vi.fn()}
        onRename={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "raspberryPis.start" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "raspberryPis.pause" }));
    fireEvent.click(screen.getByRole("button", { name: "raspberryPis.stop" }));
    fireEvent.click(screen.getByRole("button", { name: "raspberryPis.emergencyStop" }));
    expect(mutate.mock.calls.map(([request]) => request)).toEqual([
      { kind: "action", action: "pause" },
      { kind: "stop" },
      { kind: "action", action: "emergency-stop" },
    ]);
    expect(screen.getByRole("button", { name: "raspberryPis.remove" })).toBeInTheDocument();
  });

  it("shows an offline Pi without any scan controls", () => {
    render(<RaspberryPiRow host={host({ connected: false })} canManage={false} onRemove={vi.fn()} onRename={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("raspberryPis.status.offline");
    expect(screen.getByText("raspberryPis.offlineHint")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("lets owners and admins update a Pi when an update is available", () => {
    const update = {
      state: { phase: "idle" as const, startedAt: null, message: null },
      available: true,
      installedVersion: "1.0.210",
      latestVersion: "1.0.214",
      rebootRequired: false,
      bootId: null,
    };
    const { rerender } = render(
      <RaspberryPiRow host={host({ update })} canManage onRemove={vi.fn()} onRename={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "raspberryPis.update.button" }));
    expect(updateMutate).toHaveBeenCalledTimes(1);
    rerender(<RaspberryPiRow host={host({ update })} canManage={false} onRemove={vi.fn()} onRename={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "raspberryPis.update.button" })).not.toBeInTheDocument();
  });
});
