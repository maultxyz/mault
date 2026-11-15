import { describe, expect, it } from "vitest";
import { authPathReturningTo, safeAuthRedirectPath, signInPathReturningTo } from "@/lib/auth-redirect";

describe("safeAuthRedirectPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeAuthRedirectPath("/watch/abc?token=x&trade=1")).toBe("/watch/abc?token=x&trade=1");
  });

  it("rejects missing, absolute and protocol-relative targets", () => {
    expect(safeAuthRedirectPath(null)).toBeNull();
    expect(safeAuthRedirectPath("")).toBeNull();
    expect(safeAuthRedirectPath("https://evil.example")).toBeNull();
    expect(safeAuthRedirectPath("//evil.example")).toBeNull();
    expect(safeAuthRedirectPath("/\\evil.example")).toBeNull();
  });
});

describe("signInPathReturningTo", () => {
  it("encodes the return path as the redirect parameter", () => {
    const path = signInPathReturningTo("/watch/abc?token=x&trade=1");
    const url = new URL(path, "https://mault.test");
    expect(url.pathname).toBe("/auth/sign-in");
    expect(url.searchParams.get("redirectTo")).toBe("/watch/abc?token=x&trade=1");
  });

  it("drops unsafe return paths", () => {
    expect(authPathReturningTo("/auth/sign-up", "//evil.example")).toBe("/auth/sign-up");
  });
});
