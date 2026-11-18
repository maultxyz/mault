import type { NEON_SOCIAL_PROVIDERS } from "../constants/auth.constant";

export type NeonSocialProvider = (typeof NEON_SOCIAL_PROVIDERS)[number];

export interface LinkedSignInAccount {
  id: string;
  providerId: string;
  accountId: string;
  createdAt: string | Date;
}
