import type { NEON_SOCIAL_PROVIDERS } from "../constants/auth.constant";

export type NeonSocialProvider = (typeof NEON_SOCIAL_PROVIDERS)[number];
