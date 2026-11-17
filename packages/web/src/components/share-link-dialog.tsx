import { ShareLinkDetails } from "@/components/share-link-details";
import { ShareLinkForm } from "@/components/share-link-form";
import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { useShareLinks } from "@/features/share-links/api/use-share-links";
import { ShareLinkList } from "@/features/share-links/components/share-link-list";
import { SharedCardLinkList } from "@/features/share-links/components/shared-card-link-list";
import { ViewTabs } from "@/components/view-tabs";
import { shareLinkUrl } from "@/features/share-links/lib/share-link-paths";
import { SHARE_LINKS_QUERY_KEY } from "@/lib/constants/share-links";
import type {
  ShareLinkDetailsData,
  ShareLinkDialogProps,
  ShareLinkDialogTab,
  ShareLinkDialogView,
} from "@/lib/interfaces/share-links";
import { toast } from "@/lib/toast";
import {
  monitorLinkSchema,
  type MonitorLinkFormValues,
} from "@/schemas/monitor-link.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DEFAULT_MONITOR_LINK_EXPIRY_DAYS,
  DEFAULT_SHARE_LINK_PURPOSE,
  DEFAULT_SHARE_LINK_REQUIRES_GUEST_CONTACT,
  DEFAULT_SHARE_LINK_SHOWS_PRICES,
  type OrgShareLink,
} from "@magic-vault/shared";
import { DeleteDialog } from "@/components/delete-dialog";
import { IconLoader2, IconPlus } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

const FORM_DEFAULT_VALUES: MonitorLinkFormValues = {
  purpose: DEFAULT_SHARE_LINK_PURPOSE,
  expiresInDays: String(DEFAULT_MONITOR_LINK_EXPIRY_DAYS),
  showPrices: DEFAULT_SHARE_LINK_SHOWS_PRICES,
  requireGuestContact: DEFAULT_SHARE_LINK_REQUIRES_GUEST_CONTACT,
};

function detailsOf(link: OrgShareLink): ShareLinkDetailsData {
  return {
    guid: link.guid,
    url: shareLinkUrl(link),
    expiresAt: link.expiresAt,
    purpose: link.purpose,
    showsPrices: link.showsPrices,
  };
}

export function ShareLinkDialog({
  subjectGuid,
  title,
  description,
  renderTrigger,
  open: controlledOpen,
  onOpenChange,
  revokedMessage,
  createLink,
  revokeLinks,
  sharedCardsCollectionGuid,
  startsWithNewTradeLink = false,
}: ShareLinkDialogProps) {
  const { t } = useTranslation("common");
  const { t: tShareLinks } = useTranslation("share-links");
  const formId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const viewChangedRef = useRef(false);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const [view, setView] = useState<ShareLinkDialogView>("links");
  const [tab, setTab] = useState<ShareLinkDialogTab>("links");
  const showsSharedCards = view === "links" && tab === "cards" && !!sharedCardsCollectionGuid;
  const [details, setDetails] = useState<ShareLinkDetailsData | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [isRevokeAllConfirmOpen, setIsRevokeAllConfirmOpen] = useState(false);
  const queryClient = useQueryClient();
  const { links, revoke } = useShareLinks(subjectGuid);

  const form = useForm<MonitorLinkFormValues>({
    resolver: zodResolver(monitorLinkSchema),
    defaultValues: FORM_DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open || !startsWithNewTradeLink) return;
    form.reset({ ...FORM_DEFAULT_VALUES, purpose: "trade" });
    setView("new");
  }, [open, startsWithNewTradeLink, form]);

  useEffect(() => {
    if (!viewChangedRef.current) return;
    headingRef.current?.focus();
  }, [view]);

  const showView = (nextView: ShareLinkDialogView) => {
    viewChangedRef.current = true;
    setView(nextView);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setUncontrolledOpen(isOpen);
    onOpenChange?.(isOpen);
    if (!isOpen) {
      viewChangedRef.current = false;
      setView("links");
      setTab("links");
      setDetails(null);
      form.reset(FORM_DEFAULT_VALUES);
    }
  };

  const startNewLink = () => {
    form.reset(FORM_DEFAULT_VALUES);
    showView("new");
  };

  const showLink = (link: OrgShareLink) => {
    setDetails(detailsOf(link));
    showView("link");
  };

  const handleCreate = async (values: MonitorLinkFormValues) => {
    try {
      const created = await createLink({
        purpose: values.purpose,
        expiresInDays: Number(values.expiresInDays),
        showPrices: values.showPrices,
        requireGuestContact: values.requireGuestContact,
      });
      void queryClient.invalidateQueries({ queryKey: SHARE_LINKS_QUERY_KEY });
      setDetails({
        guid: created.guid,
        url: created.url,
        expiresAt: created.expiresAt,
        purpose: values.purpose,
        showsPrices: values.showPrices,
      });
      showView("link");
    } catch {
      toast.error(t("shareLink.createFailed"));
    }
  };

  const handleRevokeAll = async () => {
    setIsRevokingAll(true);
    try {
      await revokeLinks();
      await queryClient.invalidateQueries({ queryKey: SHARE_LINKS_QUERY_KEY });
      toast.success(revokedMessage);
      setDetails(null);
      showView("links");
    } catch {
      toast.error(t("shareLink.revokeFailed"));
    } finally {
      setIsRevokingAll(false);
    }
  };

  const handleRevokeShownLink = () => {
    if (!details?.guid) return;
    revoke.mutate(details.guid, {
      onSuccess: () => {
        setDetails(null);
        showView("links");
      },
    });
  };

  const isSubmitting = form.formState.isSubmitting;
  const isRevokingShownLink =
    revoke.isPending && !!details?.guid && revoke.variables === details.guid;
  const viewHeading =
    view === "new"
      ? tShareLinks("newLink")
      : view === "link"
        ? tShareLinks("linkHeading")
        : showsSharedCards
          ? tShareLinks("sharedCards")
          : tShareLinks("activeLinks");

  const newLinkButton = (
    <Button type="button" onClick={startNewLink}>
      <IconPlus />
      {tShareLinks("newLink")}
    </Button>
  );

  const footer = showsSharedCards ? (
    <Button variant="outline" onClick={() => handleOpenChange(false)}>
      {t("shareLink.close")}
    </Button>
  ) : view === "new" ? (
      <>
        <Button variant="outline" onClick={() => showView("links")}>
          {tShareLinks("back")}
        </Button>
        <Button type="submit" form={formId} disabled={isSubmitting}>
          {isSubmitting && <IconLoader2 className="animate-spin motion-reduce:animate-none" />}
          {t("shareLink.create")}
        </Button>
      </>
    ) : view === "link" ? (
      <>
        {details?.guid && (
          <Button
            variant="destructive"
            className="md:mr-auto"
            onClick={handleRevokeShownLink}
            disabled={isRevokingShownLink}
          >
            {isRevokingShownLink && <IconLoader2 className="animate-spin motion-reduce:animate-none" />}
            {tShareLinks("revoke")}
          </Button>
        )}
        <Button variant="outline" onClick={() => showView("links")}>
          {tShareLinks("backToLinks")}
        </Button>
      </>
    ) : (
      <>
        {links.length > 0 && (
          <Button
            variant="destructive"
            className="md:mr-auto"
            onClick={() => setIsRevokeAllConfirmOpen(true)}
            disabled={isRevokingAll}
          >
            {isRevokingAll && <IconLoader2 className="animate-spin motion-reduce:animate-none" />}
            {t("shareLink.revokeAll")}
          </Button>
        )}
        <Button variant="outline" onClick={() => handleOpenChange(false)}>
          {t("shareLink.close")}
        </Button>
        {links.length > 0 && newLinkButton}
      </>
    );

  return (
    <>
    <DynamicDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      trigger={renderTrigger?.(links.length)}
      footer={footer}
      footerClassName="flex-col-reverse md:flex-row"
    >
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        <div className="flex flex-col gap-3 md:gap-2 py-0.5">
          {sharedCardsCollectionGuid && view === "links" && (
            <ViewTabs<ShareLinkDialogTab>
              label={tShareLinks("tabsLabel")}
              items={[
                { key: "links", label: tShareLinks("linksTab") },
                { key: "cards", label: tShareLinks("sharedCards") },
              ]}
              value={tab}
              onChange={setTab}
            />
          )}
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="text-control font-medium outline-none"
          >
            {viewHeading}
          </h3>
          {showsSharedCards && sharedCardsCollectionGuid && (
            <SharedCardLinkList collectionGuid={sharedCardsCollectionGuid} />
          )}
          {view === "links" && !showsSharedCards && (
            <ShareLinkList
              subjectGuid={subjectGuid}
              onShowQr={showLink}
              emptyAction={newLinkButton}
            />
          )}
          {view === "new" && (
            <ShareLinkForm formId={formId} form={form} onSubmit={handleCreate} />
          )}
          {view === "link" && details && <ShareLinkDetails details={details} />}
        </div>
      </div>
    </DynamicDialog>
    <DeleteDialog
      open={isRevokeAllConfirmOpen}
      onOpenChange={setIsRevokeAllConfirmOpen}
      title={t("shareLink.revokeAllConfirmTitle")}
      description={t("shareLink.revokeAllConfirmDescription")}
      confirmLabel={t("shareLink.revokeAll")}
      onConfirm={() => {
        setIsRevokeAllConfirmOpen(false);
        void handleRevokeAll();
      }}
    />
    </>
  );
}
