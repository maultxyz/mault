import { useDevice } from "@/features/calibration/api/use-device";
import { DEFAULT_CHANNEL_LAYOUT, type ChannelLayout } from "@magic-vault/shared";

export function useChannelLayout(): ChannelLayout {
  const device = useDevice();
  return device?.channelLayout ?? DEFAULT_CHANNEL_LAYOUT;
}
