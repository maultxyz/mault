import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { z } from "zod";

type ConfirmMode =
  | { type: "simple" }
  | { type: "name"; name: string }
  | { type: "keyword" };

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children?: React.ReactNode;
  confirm?: ConfirmMode;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function DeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirm = { type: "simple" },
  confirmLabel,
  onConfirm,
}: DeleteDialogProps) {
  const { t } = useTranslation("common");
  const schema = z.object({ input: z.string() }).superRefine((data, ctx) => {
    if (confirm.type === "keyword" && data.input !== "delete") {
      ctx.addIssue({
        code: "custom",
        message: t("deleteDialog.typeDeleteToConfirm"),
        path: ["input"],
      });
    } else if (confirm.type === "name" && data.input !== confirm.name) {
      ctx.addIssue({
        code: "custom",
        message: t("deleteDialog.typeNameToConfirm", { name: confirm.name }),
        path: ["input"],
      });
    }
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { input: "" },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = () => {
    onConfirm();
    onOpenChange(false);
  };

  const placeholder =
    confirm.type === "keyword"
      ? "delete"
      : confirm.type === "name"
        ? confirm.name
        : undefined;

  const label =
    confirm.type === "keyword" ? (
      <Trans
        t={t}
        i18nKey="deleteDialog.typeKeywordLabel"
        components={{
          code: <span className="font-mono font-medium text-foreground" />,
        }}
      />
    ) : confirm.type === "name" ? (
      <Trans
        t={t}
        i18nKey="deleteDialog.typeNameLabel"
        values={{ name: confirm.name }}
        components={{
          code: <span className="font-mono font-medium text-foreground" />,
        }}
      />
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {children}

          {confirm.type !== "simple" && (
            <Field className="my-4" data-invalid={!!errors.input}>
              <p className="text-sm text-muted-foreground mb-1.5">{label}</p>
              <Input
                {...register("input")}
                placeholder={placeholder}
                autoComplete="off"
                autoFocus
              />
              <FieldError errors={[errors.input]} />
            </Field>
          )}

          <DialogFooter className={confirm.type === "simple" ? "mt-4" : undefined}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={confirm.type !== "simple" && !isValid}
            >
              {confirmLabel ?? t("actions.delete")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
