import { useIsMobile } from "@/hooks/use-is-mobile";
import { COLLECTIONS_PATH } from "@/lib/constants/collections";
import { LIBRARY_PATH } from "@/lib/constants/nav";
import { Navigate } from "react-router-dom";

export default function MonitorSessionsPage() {
  const isMobile = useIsMobile();
  return <Navigate to={isMobile ? LIBRARY_PATH : COLLECTIONS_PATH} replace />;
}
