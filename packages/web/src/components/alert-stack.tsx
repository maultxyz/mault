import { AlertBanner } from "@/components/alert-banner";
import { useAppAlertsContext } from "@/hooks/alerts/use-app-alerts";

export function AlertStack() {
  const { visibleAlerts, dismiss, portals } = useAppAlertsContext();

  return (
    <>
      {visibleAlerts.map((alert) => (
        <AlertBanner
          key={alert.id}
          alert={alert}
          onDismiss={() => dismiss(alert.id)}
        />
      ))}
      {portals}
    </>
  );
}
