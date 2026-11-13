import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PiScanSessionState } from "@magic-vault/shared";
import { usePiScanSound } from "./use-pi-scan-sound";

const mocks = vi.hoisted(() => ({
  orgId: "org-a", clips: [] as { guid: string; url: string }[],
  stream: null as EventTarget | null,
  play: vi.fn(), busy: false, pause: vi.fn(),
}));
vi.mock("@/features/companies/api/use-organization", () => ({ useOrg: () => ({ activeOrg: { id: mocks.orgId } }) }));
vi.mock("@/features/sounds/api/sounds", () => ({ soundClipsQueryOptions: () => ({}) }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: mocks.clips }) }));
vi.mock("@/lib/app-stream", () => ({ useAppStreamSource: () => mocks.stream }));
vi.mock("@/features/sounds/lib/sound-playback", () => ({
  isSoundPlaying: () => mocks.busy, playSoundExclusively: mocks.play,
}));

function state(...ids: string[]): PiScanSessionState {
  return { phase: "idle", soundEvents: ids.map((id) => ({ id, clipGuid: "clip", at: 1 })) } as PiScanSessionState;
}

beforeEach(() => {
  mocks.orgId = "org-a";
  mocks.clips = [{ guid: "clip", url: "https://example.com/clip.mp3" }];
  mocks.stream = new EventTarget();
  mocks.busy = false;
  mocks.play.mockReset();
  mocks.pause.mockReset();
  vi.stubGlobal("Audio", class {
    src: string;
    preload = "";
    pause = mocks.pause;
    constructor(src: string) { this.src = src; }
  });
});

describe("Pi scan sound delivery", () => {
  it("baselines history and deduplicates new events independently of browser clock", () => {
    const { rerender } = renderHook(({ session }) => usePiScanSound(session, true), { initialProps: { session: state("history") } });
    expect(mocks.play).not.toHaveBeenCalled();
    rerender({ session: state("history", "new") });
    expect(mocks.play).toHaveBeenCalledTimes(1);
    rerender({ session: state("history", "new") });
    expect(mocks.play).toHaveBeenCalledTimes(1);
  });

  it("waits for the first host snapshot before baselining history", () => {
    const initial = { phase: "idle" } as PiScanSessionState;
    const { rerender } = renderHook(({ session }) => usePiScanSound(session, true), { initialProps: { session: initial } });
    rerender({ session: state("history") });
    expect(mocks.play).not.toHaveBeenCalled();
    rerender({ session: state("live") });
    expect(mocks.play).toHaveBeenCalledTimes(1);
  });

  it("baselines the first snapshot after reconnect", () => {
    const { rerender } = renderHook(({ session }) => usePiScanSound(session, true), { initialProps: { session: state("history") } });
    act(() => mocks.stream?.dispatchEvent(new Event("open")));
    rerender({ session: state("history", "during-disconnect") });
    expect(mocks.play).not.toHaveBeenCalled();
    rerender({ session: state("during-disconnect", "live") });
    expect(mocks.play).toHaveBeenCalledTimes(1);
  });

  it("consumes unavailable clips and busy events without replaying them later", () => {
    mocks.clips = [];
    const { rerender } = renderHook(({ session }) => usePiScanSound(session, true), { initialProps: { session: state() } });
    rerender({ session: state("unavailable") });
    mocks.clips = [{ guid: "clip", url: "https://example.com/clip.mp3" }];
    rerender({ session: state("unavailable") });
    mocks.busy = true;
    rerender({ session: state("unavailable", "busy") });
    mocks.busy = false;
    rerender({ session: state("unavailable", "busy") });
    expect(mocks.play).not.toHaveBeenCalled();
    rerender({ session: state("available") });
    expect(mocks.play).toHaveBeenCalledTimes(1);
  });

  it("isolates organization history and stops playback and listeners on unmount", () => {
    const remove = vi.spyOn(mocks.stream!, "removeEventListener");
    const { rerender, unmount } = renderHook(({ session }) => usePiScanSound(session, true), { initialProps: { session: state() } });
    rerender({ session: state("org-a-event") });
    expect(mocks.play).toHaveBeenCalledTimes(1);
    mocks.orgId = "org-b";
    rerender({ session: state("org-b-history") });
    expect(mocks.play).toHaveBeenCalledTimes(1);
    rerender({ session: state("org-b-live") });
    expect(mocks.play).toHaveBeenCalledTimes(2);
    unmount();
    expect(remove).toHaveBeenCalledWith("open", expect.any(Function));
    expect(mocks.pause).toHaveBeenCalledTimes(2);
  });
});
