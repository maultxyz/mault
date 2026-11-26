import { publicGet } from "@/lib/api/client";
import { PI_LINK_LOCAL_STATUS_API, PI_LINK_SETUP_POLL_MS } from "@/lib/constants/raspberry-pis";
import type { PiLinkSetup } from "@/lib/interfaces/raspberry-pis";
import type { PiLinkLocalStatusResponse, Result } from "@magic-vault/shared";
import { useEffect, useState } from "react";

export function usePiLinkSetup(): PiLinkSetup {
  const [setup, setSetup] = useState<PiLinkSetup>({ status: null, isUnreachable: false });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pull = async () => {
      try {
        const result = await publicGet<Result<PiLinkLocalStatusResponse>>(PI_LINK_LOCAL_STATUS_API);
        if (!cancelled) setSetup({ status: result.data ?? null, isUnreachable: !result.data });
      } catch {
        if (!cancelled) setSetup((current) => ({ ...current, isUnreachable: true }));
      }
      if (!cancelled) timer = setTimeout(() => void pull(), PI_LINK_SETUP_POLL_MS);
    };
    void pull();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return setup;
}
