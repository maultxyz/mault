import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SaveBar } from "@/components/save-bar";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { neon } from "@/lib/auth/client";
import {
  updateNameSchema,
  type UpdateNameFormValues,
} from "@/schemas/account.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function UpdateNameForm() {
  const { t } = useTranslation("account");
  const { data, refetch } = neon.auth.useSession();

  const form = useForm<UpdateNameFormValues>({
    resolver: zodResolver(updateNameSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (data?.user?.name !== undefined) {
      form.reset({ name: data.user.name });
    }
  }, [data?.user?.name, form]);

  async function onSubmit({ name }: UpdateNameFormValues) {
    try {
      const { error } = await neon.auth.updateUser({ name });
      if (error) throw new Error(error.message);
      await refetch();
      toast.success(t("profile.updated"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("profile.updateFailed"));
    }
  }

  return (
    <>
      <form
        id="update-name-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex max-w-sm flex-col gap-3"
      >
        <Field data-invalid={!!form.formState.errors.name}>
          <FieldLabel htmlFor="name">{t("profile.nameLabel")}</FieldLabel>
          <Input id="name" autoComplete="name" {...form.register("name")} />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>
      </form>
      <SaveBar
        show={form.formState.isDirty}
        formId="update-name-form"
        isSaving={form.formState.isSubmitting}
        onDiscard={() => form.reset()}
      />
      <UnsavedChangesGuard isDirty={form.formState.isDirty} />
    </>
  );
}
