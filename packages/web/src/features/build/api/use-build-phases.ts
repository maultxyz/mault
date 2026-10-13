import { useBuildSetup } from "@/features/build/api/use-build-setup";
import { buildPhases } from "@/features/build/lib/build-phases";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function useBuildPhases() {
  const { t } = useTranslation("build");
  const { moduleCount, boardType, mountType, usingKit } = useBuildSetup();

  return useMemo(
    () => buildPhases(t, moduleCount, boardType, mountType, usingKit),
    [t, moduleCount, boardType, mountType, usingKit],
  );
}
