import { EMPTY_WIDGET_LOGO } from "@/lib/constants/widgets";
import type { WidgetLogo } from "@/lib/interfaces/widgets";

export async function cacheWidgetLogo(): Promise<WidgetLogo> {
  return EMPTY_WIDGET_LOGO;
}
