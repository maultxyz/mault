import { useStations } from "@/features/scanner/api/use-stations";
import { SCANNER_PATH } from "@/lib/constants/scanner";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export function useNextSorterNeedingAttention() {
  const { nextStationIdNeedingAttention, setActiveStation } = useStations();
  const navigate = useNavigate();
  const goToNextSorterNeedingAttention = useCallback(() => {
    if (!nextStationIdNeedingAttention) return;
    setActiveStation(nextStationIdNeedingAttention);
    navigate(SCANNER_PATH);
  }, [nextStationIdNeedingAttention, setActiveStation, navigate]);
  return {
    nextStationIdNeedingAttention,
    goToNextSorterNeedingAttention: nextStationIdNeedingAttention
      ? goToNextSorterNeedingAttention
      : undefined,
  };
}
