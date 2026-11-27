import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCollections } from "@/features/collections/api/use-collections";
import { useRaspberryPiScan } from "@/features/raspberry-pis/api/use-raspberry-pis";
import {
  RASPBERRY_PI_FOIL_NONE_VALUE,
  RASPBERRY_PI_START_FORM_ID,
} from "@/lib/constants/raspberry-pis";
import type { RaspberryPiStartDialogProps } from "@/lib/interfaces/raspberry-pis";
import {
  CARD_CONDITIONS,
  DEFAULT_CARD_CONDITION,
  piHostScanStartBody,
  piHostScanStartFormSchema,
  type PiHostScanStartFormValues,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2, IconPlayerPlay } from "@tabler/icons-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function RaspberryPiStartDialog({ host, open, onOpenChange }: RaspberryPiStartDialogProps) {
  const { t } = useTranslation(["settings", "cards"]);
  const { collections, activeCollection } = useCollections();
  const scan = useRaspberryPiScan(host.guid);
  const idPrefix = `raspberry-pi-start-${host.guid}`;
  const form = useForm<PiHostScanStartFormValues>({
    resolver: zodResolver(piHostScanStartFormSchema),
    values: {
      collectionGuid: activeCollection?.guid ?? collections[0]?.guid ?? "",
      condition: DEFAULT_CARD_CONDITION,
      foilType: "",
      preferredSetCodes: "",
      autoFeed: true,
      allowDuplicates: true,
    },
    resetOptions: { keepDirtyValues: true },
  });
  const collectionGuid = useWatch({ control: form.control, name: "collectionGuid" });
  const foilTypes =
    collections.find((collection) => collection.guid === collectionGuid)?.game?.foilTypes ?? [];
  const collectionName = (guid: string) =>
    collections.find((collection) => collection.guid === guid)?.name ?? "";

  function start(values: PiHostScanStartFormValues) {
    scan.mutate(
      { kind: "start", body: piHostScanStartBody(values) },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog drawerOnMobile={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form
          id={RASPBERRY_PI_START_FORM_ID}
          className="flex flex-col gap-4 md:gap-2"
          onSubmit={form.handleSubmit(start)}
        >
          <DialogHeader>
            <DialogTitle>{t("raspberryPis.startTitle", { name: host.name })}</DialogTitle>
            <DialogDescription>{t("raspberryPis.startDescription")}</DialogDescription>
          </DialogHeader>
          <Field data-invalid={!!form.formState.errors.collectionGuid}>
            <FieldLabel htmlFor={`${idPrefix}-collection`}>{t("raspberryPis.collectionLabel")}</FieldLabel>
            <Controller
              control={form.control}
              name="collectionGuid"
              render={({ field }) => (
                <Select
                  value={field.value || null}
                  onValueChange={(next) => {
                    field.onChange(next ?? "");
                    form.setValue("foilType", "");
                  }}
                >
                  <SelectTrigger id={`${idPrefix}-collection`} className="w-full">
                    <SelectValue placeholder={t("raspberryPis.collectionPlaceholder")}>
                      {field.value ? collectionName(field.value) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((collection) => (
                      <SelectItem key={collection.guid} value={collection.guid}>
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[form.formState.errors.collectionGuid]} />
          </Field>

          <Field>
            <FieldLabel htmlFor={`${idPrefix}-condition`}>{t("cards:condition.label")}</FieldLabel>
            <Controller
              control={form.control}
              name="condition"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(next) => next && field.onChange(next)}>
                  <SelectTrigger id={`${idPrefix}-condition`} className="w-full">
                    <SelectValue>{t(`cards:condition.names.${field.value}`)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_CONDITIONS.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {t(`cards:condition.names.${condition}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          {foilTypes.length > 0 && (
            <Field>
              <FieldLabel htmlFor={`${idPrefix}-foil`}>{t("raspberryPis.foilLabel")}</FieldLabel>
              <Controller
                control={form.control}
                name="foilType"
                render={({ field }) => (
                  <Select
                    value={field.value || RASPBERRY_PI_FOIL_NONE_VALUE}
                    onValueChange={(next) =>
                      field.onChange(!next || next === RASPBERRY_PI_FOIL_NONE_VALUE ? "" : next)
                    }
                  >
                    <SelectTrigger id={`${idPrefix}-foil`} className="w-full">
                      <SelectValue>{field.value || t("raspberryPis.foilAuto")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={RASPBERRY_PI_FOIL_NONE_VALUE}>{t("raspberryPis.foilAuto")}</SelectItem>
                      {foilTypes.map((foilType) => (
                        <SelectItem key={foilType} value={foilType}>
                          {foilType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldDescription>{t("raspberryPis.foilDescription")}</FieldDescription>
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor={`${idPrefix}-sets`}>{t("raspberryPis.setsLabel")}</FieldLabel>
            <Input
              id={`${idPrefix}-sets`}
              placeholder={t("raspberryPis.setsPlaceholder")}
              autoComplete="off"
              spellCheck={false}
              {...form.register("preferredSetCodes")}
            />
            <FieldDescription>{t("raspberryPis.setsDescription")}</FieldDescription>
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={`${idPrefix}-auto-feed`}>{t("raspberryPis.autoFeedLabel")}</FieldLabel>
              <FieldDescription>{t("raspberryPis.autoFeedDescription")}</FieldDescription>
            </FieldContent>
            <Controller
              control={form.control}
              name="autoFeed"
              render={({ field }) => (
                <Switch id={`${idPrefix}-auto-feed`} checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={`${idPrefix}-duplicates`}>{t("raspberryPis.duplicatesLabel")}</FieldLabel>
              <FieldDescription>{t("raspberryPis.duplicatesDescription")}</FieldDescription>
            </FieldContent>
            <Controller
              control={form.control}
              name="allowDuplicates"
              render={({ field }) => (
                <Switch id={`${idPrefix}-duplicates`} checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={scan.isPending}>
              {scan.isPending ? <IconLoader2 className="animate-spin" /> : <IconPlayerPlay />}
              {t("raspberryPis.start")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
