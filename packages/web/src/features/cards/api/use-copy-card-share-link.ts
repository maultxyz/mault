import { createCardShareLink } from "@/features/cards/api/card-share-links";
import { shareLinkUrl } from "@/features/share-links/lib/share-link-paths";
import { copyTextFromPromise } from "@/lib/clipboard";
import { SHARE_LINKS_QUERY_KEY } from "@/lib/constants/share-links";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function useCopyCardShareLink() {
  const { t } = useTranslation("cards");
  const queryClient = useQueryClient();
  const [isCopying, setIsCopying] = useState(false);

  const copyCardShareLink = async (scanId: string) => {
    setIsCopying(true);
    const url = createCardShareLink(scanId).then((result) => {
      if (!result.success || !result.data) throw new Error(result.message);
      return shareLinkUrl({ ...result.data, kind: "card", subjectGuid: scanId });
    });
    try {
      await copyTextFromPromise(url);
      toast.success(t("shareCardLink.copied"));
    } catch {
      toast.error(t("shareCardLink.copyFailed"));
    } finally {
      setIsCopying(false);
      void queryClient.invalidateQueries({ queryKey: SHARE_LINKS_QUERY_KEY });
    }
  };

  return { copyCardShareLink, isCopying };
}
