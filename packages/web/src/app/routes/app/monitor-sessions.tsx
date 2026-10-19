import { MobileHome } from "@/features/collections/components/mobile-home";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { COLLECTIONS_PATH } from "@/lib/constants/collections";
import { Navigate } from "react-router-dom";

export default function MonitorSessionsPage() {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileHome />;
  return <Navigate to={COLLECTIONS_PATH} replace />;
}
