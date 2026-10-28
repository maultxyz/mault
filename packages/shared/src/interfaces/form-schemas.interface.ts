import type { z } from "zod";
import type {
  updateNameFormSchema,
  changeEmailFormSchema,
  changePasswordFormSchema,
  createCollectionFormSchema,
  renameCollectionFormSchema,
  organizationNameFormSchema,
  organizationInviteFormSchema,
  orgApiKeyFormSchema,
  syncApiKeyFormSchema,
  storageLocationNameFormSchema,
  scanDraftFormSchema,
  discordSettingsDraftFormSchema,
  notificationRuleFormSchema,
  webhookFormSchema,
  orgSettingsDraftFormSchema,
  soundRulesDraftFormSchema,
  soundRuleFormSchema,
  soundClipNameFormSchema,
} from "../schemas/forms.schema";

export type UpdateNameFormValues = z.infer<typeof updateNameFormSchema>;
export type ChangeEmailFormValues = z.infer<typeof changeEmailFormSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
export type CreateCollectionFormValues = z.infer<typeof createCollectionFormSchema>;
export type RenameCollectionFormValues = z.infer<typeof renameCollectionFormSchema>;
export type OrganizationNameFormValues = z.infer<typeof organizationNameFormSchema>;
export type OrganizationInviteFormValues = z.infer<typeof organizationInviteFormSchema>;
export type OrgApiKeyFormValues = z.infer<typeof orgApiKeyFormSchema>;
export type SyncApiKeyFormValues = z.infer<typeof syncApiKeyFormSchema>;
export type StorageLocationNameFormValues = z.infer<typeof storageLocationNameFormSchema>;
export type ScanDraftFormValues = z.infer<typeof scanDraftFormSchema>;
export type DiscordSettingsDraftFormValues = z.infer<typeof discordSettingsDraftFormSchema>;
export type NotificationRuleFormValues = z.infer<typeof notificationRuleFormSchema>;
export type WebhookFormValues = z.infer<typeof webhookFormSchema>;
export type OrgSettingsDraftFormValues = z.infer<typeof orgSettingsDraftFormSchema>;
export type SoundRulesDraftFormValues = z.infer<typeof soundRulesDraftFormSchema>;
export type SoundRuleFormValues = z.infer<typeof soundRuleFormSchema>;
export type SoundClipNameFormValues = z.infer<typeof soundClipNameFormSchema>;

export type DiscordChannelsDraft =
  DiscordSettingsDraftFormValues["overrides"][string];
