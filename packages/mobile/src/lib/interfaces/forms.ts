import type { z } from "zod";
import type {
  changeEmailSchema,
  changePasswordSchema,
  signInSchema,
  updateNameSchema,
} from "@/features/account/lib/auth-schemas";
import type { cardScanSchema } from "@/features/cards/lib/card-scan-schema";
import type { discordSettingsSchema, notificationRuleSchema } from "@/features/integrations/lib/discord-settings-schema";
import type { webhookSchema } from "@/features/integrations/lib/webhook-schema";
import type { soundClipNameSchema, soundRuleSchema, soundRulesDraftSchema } from "@/features/sounds/lib/sound-schema";
import type { binSchema } from "@/features/rules/lib/bin-schema";
import type { createCollectionSchema, renameCollectionSchema } from "@/features/collections/lib/collection-schemas";
import type { apiKeySchema } from "@/features/integrations/lib/api-key-schema";
import type { inviteMemberSchema, renameOrgSchema } from "@/features/org/lib/org-schemas";
import type { orgSettingsDraftSchema } from "@/features/settings/lib/org-settings-schema";
import type { storageNameSchema } from "@/features/storage/lib/storage-schemas";

export type SignInValues = z.infer<typeof signInSchema>;

export type BinFormValues = z.infer<typeof binSchema>;

export type CreateCollectionValues = z.infer<typeof createCollectionSchema>;

export type RenameCollectionValues = z.infer<typeof renameCollectionSchema>;

export type StorageNameValues = z.infer<typeof storageNameSchema>;

export type OrgSettingsDraftValues = z.infer<typeof orgSettingsDraftSchema>;

export type InviteMemberValues = z.infer<typeof inviteMemberSchema>;

export type RenameOrgValues = z.infer<typeof renameOrgSchema>;

export type ApiKeyValues = z.infer<typeof apiKeySchema>;

export type CardScanDraftValues = z.infer<typeof cardScanSchema>;

export type WebhookValues = z.infer<typeof webhookSchema>;

export type DiscordSettingsValues = z.infer<typeof discordSettingsSchema>;

export type NotificationRuleValues = z.infer<typeof notificationRuleSchema>;

export type SoundRulesDraftValues = z.infer<typeof soundRulesDraftSchema>;

export type SoundRuleValues = z.infer<typeof soundRuleSchema>;

export type SoundClipNameValues = z.infer<typeof soundClipNameSchema>;

export type UpdateNameValues = z.infer<typeof updateNameSchema>;

export type ChangeEmailValues = z.infer<typeof changeEmailSchema>;

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
