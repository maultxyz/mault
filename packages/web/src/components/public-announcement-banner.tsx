import { AlertBanner } from "@/components/alert-banner";
import { usePublicAnnouncementAlerts } from "@/hooks/alerts/use-announcement-alerts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const publicQueryClient = new QueryClient();

function PublicAnnouncementBannerContent() {
  const alerts = usePublicAnnouncementAlerts();

  return (
    <>
      {alerts.map((alert) => (
        <AlertBanner key={alert.id} alert={alert} />
      ))}
    </>
  );
}

export function PublicAnnouncementBanner() {
  return (
    <QueryClientProvider client={publicQueryClient}>
      <PublicAnnouncementBannerContent />
    </QueryClientProvider>
  );
}
