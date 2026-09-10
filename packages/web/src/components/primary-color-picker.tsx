import {
  DEFAULT_ORG_SETTINGS,
  orgSettingsQueryOptions,
  saveOrgSettings,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { THEME_COLORS, type ThemeColor } from "@/lib/constants/colors";
import { applyPrimaryColor, resetPrimaryColor } from "@/lib/primary-color";
import { cn } from "@/lib/utils";
import { IconCheck, IconRotate } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function PrimaryColorPicker() {
  const { t } = useTranslation("settings");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const queryOpts = orgSettingsQueryOptions(activeOrg?.id);

  const { data } = useQuery(queryOpts);
  const selectedName = data?.primaryColor ?? null;

  const mutation = useMutation({
    mutationFn: (primaryColor: string | null) =>
      saveOrgSettings({ primaryColor }),
    onMutate: async (primaryColor) => {
      await queryClient.cancelQueries({ queryKey: queryOpts.queryKey });
      const previous = queryClient.getQueryData(queryOpts.queryKey);
      queryClient.setQueryData(
        queryOpts.queryKey,
        (old: typeof data): typeof data => ({
          ...(old ?? DEFAULT_ORG_SETTINGS),
          primaryColor,
        }),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(queryOpts.queryKey, ctx.previous);
    },
    onSuccess: (result) => {
      if (result.success && result.data)
        queryClient.setQueryData(queryOpts.queryKey, result.data);
    },
  });

  function handleSelect(color: ThemeColor) {
    applyPrimaryColor(color);
    mutation.mutate(color.name);
  }

  function handleReset() {
    resetPrimaryColor();
    mutation.mutate(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {THEME_COLORS.map((color) => {
          const isSelected = selectedName === color.name;
          return (
            <button
              key={color.name}
              type="button"
              title={color.name}
              onClick={() => handleSelect(color)}
              className={cn(
                "size-7 rounded-md shrink-0 transition-all ring-offset-background",
                isSelected
                  ? "ring-2 ring-offset-2 ring-foreground scale-110"
                  : "hover:scale-110",
              )}
              style={{ background: color.value }}
            >
              {isSelected && (
                <IconCheck
                  size={14}
                  style={{ color: color.fg }}
                  className="mx-auto"
                />
              )}
              <span className="sr-only">{color.name}</span>
            </button>
          );
        })}

        {selectedName && (
          <button
            type="button"
            title={t("appearance.resetColor")}
            onClick={handleReset}
            className="size-7 rounded-md shrink-0 border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors hover:border-foreground"
          >
            <IconRotate size={13} />
            <span className="sr-only">{t("appearance.resetColor")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
