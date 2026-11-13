import { AdminMobileMenu } from "@/features/admin/components/admin-mobile-menu";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Navigate } from "react-router-dom";

export default function AdminIndexPage() {
  const isMobile = useIsMobile();
  if (isMobile) return <AdminMobileMenu />;
  return <Navigate to="cards" replace />;
}
