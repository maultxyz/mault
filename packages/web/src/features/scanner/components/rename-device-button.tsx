import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { useRenameDevice } from "@/features/calibration/api/use-rename-device";
import type { RenameDeviceButtonProps } from "@/lib/interfaces/stations";
import {
  renameDeviceSchema,
  type RenameDeviceFormValues,
} from "@/schemas/devices.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconEdit, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function RenameDeviceButton({ device }: RenameDeviceButtonProps) {
  const { t } = useTranslation("scanner");
  const { t: tCommon } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const renameDevice = useRenameDevice();
  const form = useForm<RenameDeviceFormValues>({
    resolver: zodResolver(renameDeviceSchema),
    defaultValues: { name: device.name },
    mode: "onChange",
  });
  const label = t("stations.overview.rename", { name: device.name });
  const formId = `rename-device-${device.guid}`;

  const handleSubmit = async (values: RenameDeviceFormValues) => {
    if (values.name !== device.name) {
      await renameDevice.mutateAsync({ guid: device.guid, name: values.name });
    }
    setOpen(false);
  };

  return (
    <>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={label}
        title={label}
        onClick={() => {
          form.reset({ name: device.name });
          setOpen(true);
        }}
      >
        <IconEdit />
      </Button>
      <DynamicDialog
        open={open}
        onOpenChange={setOpen}
        title={t("stations.overview.renameDialog.title")}
        description={t("stations.overview.renameDialog.description")}
        trigger={<span />}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tCommon("actions.cancel")}
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={!form.formState.isValid || renameDevice.isPending}
            >
              {renameDevice.isPending && <IconLoader2 className="animate-spin" />}
              {t("stations.overview.renameDialog.submit")}
            </Button>
          </>
        }
        footerClassName="flex-col-reverse md:flex-row"
      >
        <form
          id={formId}
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4"
        >
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor={`${formId}-name`}>
                  {t("stations.overview.renameDialog.nameLabel")}
                </FieldLabel>
                <Input
                  {...field}
                  id={`${formId}-name`}
                  aria-invalid={fieldState.invalid}
                  autoFocus
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </form>
      </DynamicDialog>
    </>
  );
}
