import {
  COVERAGE_MAX_WINDOWS,
  COVERAGE_SAMPLE_GRID,
  WIN32,
} from "./constants/desktop";
import type { CoverageApi, ScreenRect } from "./interfaces/desktop";

let api: CoverageApi | null | undefined;

function createApi(): CoverageApi {
  const koffi: typeof import("koffi") = require("koffi");
  const user32 = koffi.load("user32.dll");
  const dwmapi = koffi.load("dwmapi.dll");
  const RECT = koffi.struct("RECT", { left: "long", top: "long", right: "long", bottom: "long" });
  const getWindow = user32.func("void* __stdcall GetWindow(void* hWnd, uint32_t uCmd)");
  const isWindowVisible = user32.func("bool __stdcall IsWindowVisible(void* hWnd)");
  const isIconic = user32.func("bool __stdcall IsIconic(void* hWnd)");
  const getWindowLong = user32.func("intptr_t __stdcall GetWindowLongPtrW(void* hWnd, int nIndex)");
  const getProcessId = user32.func(
    "uint32_t __stdcall GetWindowThreadProcessId(void* hWnd, _Out_ uint32_t* lpdwProcessId)",
  );
  const getRect = dwmapi.func(
    "long __stdcall DwmGetWindowAttribute(void* hwnd, uint32_t attr, _Out_ RECT* value, uint32_t size)",
  );
  const getCloaked = dwmapi.func(
    "long __stdcall DwmGetWindowAttribute(void* hwnd, uint32_t attr, _Out_ int* value, uint32_t size)",
  );
  const rectSize = koffi.sizeof(RECT);
  const excludedStyles = WIN32.WS_EX_TRANSPARENT | WIN32.WS_EX_TOOLWINDOW | WIN32.WS_EX_NOACTIVATE;

  const boundsOf = (hwnd: unknown): ScreenRect | null => {
    const rect: ScreenRect = { left: 0, top: 0, right: 0, bottom: 0 };
    if (getRect(hwnd, WIN32.DWMWA_EXTENDED_FRAME_BOUNDS, rect, rectSize) !== 0) return null;
    return rect.right > rect.left && rect.bottom > rect.top ? rect : null;
  };

  const coversOthers = (hwnd: unknown): boolean => {
    if (!isWindowVisible(hwnd) || isIconic(hwnd)) return false;
    if (Number(getWindowLong(hwnd, WIN32.GWL_EXSTYLE)) & excludedStyles) return false;
    const pid = [0];
    getProcessId(hwnd, pid);
    if (pid[0] === process.pid) return false;
    const cloaked = [0];
    return getCloaked(hwnd, WIN32.DWMWA_CLOAKED, cloaked, 4) !== 0 || cloaked[0] === 0;
  };

  return {
    coveredRatio: (handle) => {
      const self = koffi.decode(handle, "void*");
      const target = boundsOf(self);
      if (!target) return 0;
      const covers: ScreenRect[] = [];
      let hwnd = getWindow(self, WIN32.GW_HWNDPREV);
      for (let i = 0; hwnd && i < COVERAGE_MAX_WINDOWS; i++) {
        const rect = coversOthers(hwnd) ? boundsOf(hwnd) : null;
        if (rect) covers.push(rect);
        hwnd = getWindow(hwnd, WIN32.GW_HWNDPREV);
      }
      if (!covers.length) return 0;
      const width = target.right - target.left;
      const height = target.bottom - target.top;
      let covered = 0;
      for (let row = 0; row < COVERAGE_SAMPLE_GRID; row++) {
        const y = target.top + ((row + 0.5) * height) / COVERAGE_SAMPLE_GRID;
        for (let column = 0; column < COVERAGE_SAMPLE_GRID; column++) {
          const x = target.left + ((column + 0.5) * width) / COVERAGE_SAMPLE_GRID;
          if (covers.some((rect) => x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom)) {
            covered++;
          }
        }
      }
      return covered / COVERAGE_SAMPLE_GRID ** 2;
    },
  };
}

export function coveredRatio(handle: Buffer): number {
  if (process.platform !== "win32") return 0;
  if (api === undefined) {
    try {
      api = createApi();
    } catch {
      api = null;
    }
  }
  if (!api) return 0;
  try {
    return api.coveredRatio(handle);
  } catch {
    return 0;
  }
}
