import { registerHotkeys } from "@/lib/hotkeys";
import type { HotkeyHandlers } from "@/lib/interfaces/hotkeys";
import { useEffect, useRef } from "react";

export function useHotkeys(
  handlers: HotkeyHandlers,
  enabled = true,
  priority = 0,
) {
  const handlersRef = useRef(handlers);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    handlersRef.current = handlers;
    enabledRef.current = enabled;
  });

  useEffect(
    () =>
      registerHotkeys({
        getHandlers: () => handlersRef.current,
        isEnabled: () => enabledRef.current,
        priority,
      }),
    [priority],
  );
}
