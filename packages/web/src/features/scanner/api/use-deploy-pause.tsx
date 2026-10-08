import { DeployPauseDialog } from "@/features/scanner/components/deploy-pause-dialog";
import { useDeployNotice } from "@/lib/app-stream";
import type { DeployPauseContextValue } from "@/lib/interfaces/scanner";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const DeployPauseContext = createContext<DeployPauseContextValue>({
  reportDeployPause: () => {},
});

export function DeployPauseProvider({ children }: { children: ReactNode }) {
  const [pausedResumes, setPausedResumes] = useState<(() => void)[]>([]);

  const reportDeployPause = useCallback((resume: () => void) => {
    setPausedResumes((prev) => [...prev, resume]);
  }, []);

  const handleResume = useCallback(() => {
    for (const resume of pausedResumes) resume();
    setPausedResumes([]);
  }, [pausedResumes]);

  const handleClose = useCallback(() => setPausedResumes([]), []);

  const value = useMemo(() => ({ reportDeployPause }), [reportDeployPause]);

  return (
    <DeployPauseContext value={value}>
      {children}
      <DeployPauseDialog
        open={pausedResumes.length > 0}
        pausedCount={pausedResumes.length}
        onResume={handleResume}
        onClose={handleClose}
      />
    </DeployPauseContext>
  );
}

export function useDeployScanPause(
  isScanning: boolean,
  pause: () => void,
  resume: () => void,
) {
  const notice = useDeployNotice();
  const { reportDeployPause } = useContext(DeployPauseContext);
  const handledGuidRef = useRef<string | null>(null);
  const latestRef = useRef({ isScanning, pause, resume, reportDeployPause });
  latestRef.current = { isScanning, pause, resume, reportDeployPause };

  useEffect(() => {
    if (!notice || handledGuidRef.current === notice.guid) return;
    handledGuidRef.current = notice.guid;
    const current = latestRef.current;
    if (!current.isScanning) return;
    current.pause();
    current.reportDeployPause(current.resume);
  }, [notice]);
}
