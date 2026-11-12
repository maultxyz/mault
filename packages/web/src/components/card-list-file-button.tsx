import { Button } from "@/components/ui/button";
import { CARD_LIST_IMPORT_ACCEPT } from "@/lib/constants/card-list-import";
import type { CardListFileButtonProps } from "@/lib/interfaces/card-list-import";
import { IconFileUpload } from "@tabler/icons-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

export function CardListFileButton({ onFileRead }: CardListFileButtonProps) {
  const { t } = useTranslation("common");
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
      >
        <IconFileUpload />
        {t("actions.chooseFile")}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept={CARD_LIST_IMPORT_ACCEPT}
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          onFileRead({ text: await file.text(), fileName: file.name });
        }}
      />
    </>
  );
}
