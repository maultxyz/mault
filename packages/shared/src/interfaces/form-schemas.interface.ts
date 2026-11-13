import type { z } from "zod";
import type {
  updateNameFormSchema,
  feederTestFormSchema,
  changeEmailFormSchema,
  changePasswordFormSchema,
  createCollectionFormSchema,
  editCollectionFormSchema,
  organizationNameFormSchema,
  organizationInviteFormSchema,
  orgApiKeyFormSchema,
  syncApiKeyFormSchema,
  storageLocationNameFormSchema,
  storagePickListFormSchema,
  scanDraftFormSchema,
  discordSettingsDraftFormSchema,
  notificationRuleFormSchema,
  webhookFormSchema,
  shopCatalogFormSchema,
  orgSettingsDraftFormSchema,
  soundRulesDraftFormSchema,
  soundRuleFormSchema,
  soundClipNameFormSchema,
} from "../schemas/forms.schema";

export type UpdateNameFormValues = z.infer<typeof updateNameFormSchema>;
export type ChangeEmailFormValues = z.infer<typeof changeEmailFormSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
export type CreateCollectionFormValues = z.infer<typeof createCollectionFormSchema>;
export type EditCollectionFormValues = z.infer<typeof editCollectionFormSchema>;
export type OrganizationNameFormValues = z.infer<typeof organizationNameFormSchema>;
export type OrganizationInviteFormValues = z.infer<typeof organizationInviteFormSchema>;
export type OrgApiKeyFormValues = z.infer<typeof orgApiKeyFormSchema>;
export type SyncApiKeyFormValues = z.infer<typeof syncApiKeyFormSchema>;
export type StorageLocationNameFormValues = z.infer<typeof storageLocationNameFormSchema>;
export type ScanDraftFormValues = z.infer<typeof scanDraftFormSchema>;
export type DiscordSettingsDraftFormValues = z.infer<typeof discordSettingsDraftFormSchema>;
export type NotificationRuleFormValues = z.infer<typeof notificationRuleFormSchema>;
export type WebhookFormValues = z.infer<typeof webhookFormSchema>;
export type ShopCatalogFormValues = z.infer<typeof shopCatalogFormSchema>;
export type OrgSettingsDraftFormValues = z.infer<typeof orgSettingsDraftFormSchema>;
export type SoundRulesDraftFormValues = z.infer<typeof soundRulesDraftFormSchema>;
export type SoundRuleFormValues = z.infer<typeof soundRuleFormSchema>;
export type SoundClipNameFormValues = z.infer<typeof soundClipNameFormSchema>;

export type DiscordChannelsDraft =
  DiscordSettingsDraftFormValues["overrides"][string];
export type StoragePickListFormValues = z.infer<typeof storagePickListFormSchema>;
export type FeederTestFormValues = z.infer<typeof feederTestFormSchema>;
