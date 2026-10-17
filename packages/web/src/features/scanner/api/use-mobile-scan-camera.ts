import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useEffect, useRef } from "react";

export function useMobileScanCamera() {
  const { retryCamera, stopCamera } = useCameraContext();
  const controlsRef = useRef({ retryCamera, stopCamera });
  controlsRef.current = { retryCamera, stopCamera };

  useEffect(() => {
    void controlsRef.current.retryCamera();
    return () => controlsRef.current.stopCamera();
  }, []);
}
