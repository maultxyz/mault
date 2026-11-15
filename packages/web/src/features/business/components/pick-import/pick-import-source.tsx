import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { CARD_LIST_IMPORT_ACCEPT } from "@/lib/constants/card-list-import";
import type { PickImportSourceProps } from "@/lib/interfaces/business";
import { cn } from "@/lib/utils";
import { IconFileUpload } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function PickImportSource({
  control,
  onFileRead,
  summary,
}: PickImportSourceProps) {
  const { t } = useTranslation("csvImport");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    onFileRead({ text: await file.text(), fileName: file.name });
  };

  return (
    <div className="flex flex-col gap-4 md:gap-3">
      <button
        type="button"
        className={cn(
          "flex min-h-36 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border px-4 text-center text-sm text-foreground/70 transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground motion-reduce:transition-none",
          isDraggingOver && "border-primary/50 bg-primary/5 text-foreground",
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDraggingOver(false);
          void readFile(event.dataTransfer.files[0]);
        }}
      >
        <IconFileUpload className="size-6" aria-hidden />
        <span className="font-medium text-foreground">
          {t("pickImport.source.dropTitle")}
        </span>
        <span className="text-xs">{t("pickImport.source.dropHint")}</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={CARD_LIST_IMPORT_ACCEPT}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void readFile(file);
        }}
      />
      <Controller
        name="text"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="pick-import-text">
              {t("pickImport.source.pasteLabel")}
            </FieldLabel>
            <Textarea
              {...field}
              id="pick-import-text"
              rows={8}
              className="max-h-[40svh] overflow-y-auto font-mono"
              placeholder={t("pickImport.source.pastePlaceholder")}
            />
          </Field>
        )}
      />
      <div role="status">{summary}</div>
    </div>
  );
}
