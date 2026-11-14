import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({ publicGet: vi.fn() }));

import { isRemoteBrowser, usesHostHardware } from "./host";
import { notePiHost } from "./pi-host";

describe("Pi GPIO hardware selection", () => {
  beforeEach(() => {
    notePiHost(false);
  });

  it("uses the server controller on localhost only when explicitly reported", () => {
    expect(isRemoteBrowser()).toBe(false);
    notePiHost(true, true);
    expect(usesHostHardware()).toBe(true);
    notePiHost(true, false);
    expect(usesHostHardware()).toBe(false);
  });

  it("does not enable controller mode when Pi hosting is disabled", () => {
    notePiHost(false, true);
    expect(usesHostHardware()).toBe(false);
  });
});
