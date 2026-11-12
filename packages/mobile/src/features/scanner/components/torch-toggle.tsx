import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import type { TorchControlProps } from "@/lib/interfaces/scanner";

export function TorchToggle({ torch }: TorchControlProps) {
  const { t } = useTranslation();
  if (!torch.hasTorch) return null;
  return (
    <IconButton
      icon={torch.isOn ? "torchOn" : "torchOff"}
      variant="camera"
      size={36}
      selected={torch.isOn}
      accessibilityLabel={t("scan.torch.label")}
      onPress={torch.toggle}
    />
  );
}
