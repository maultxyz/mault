import {
  WIFI_PASSWORD_MAX_LENGTH,
  WIFI_PASSWORD_MIN_LENGTH,
  WIFI_SSID_MAX_LENGTH,
} from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { z } from "zod";

export function createSorterWifiSchema(t: TFunction<"scanner">) {
  return z.object({
    ssid: z
      .string()
      .min(1, t("sorterWifi.validation.ssidRequired"))
      .refine(
        (value) => new TextEncoder().encode(value).length <= WIFI_SSID_MAX_LENGTH,
        t("sorterWifi.validation.ssidTooLong", { max: WIFI_SSID_MAX_LENGTH }),
      ),
    password: z
      .string()
      .refine(
        (value) =>
          value.length === 0 ||
          (value.length >= WIFI_PASSWORD_MIN_LENGTH &&
            value.length <= WIFI_PASSWORD_MAX_LENGTH),
        t("sorterWifi.validation.password", {
          min: WIFI_PASSWORD_MIN_LENGTH,
          max: WIFI_PASSWORD_MAX_LENGTH,
        }),
      ),
  });
}

export type SorterWifiFormValues = z.infer<
  ReturnType<typeof createSorterWifiSchema>
>;
