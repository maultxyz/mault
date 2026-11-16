export const TRADE_OFFER_NOT_PENDING_MESSAGE = "This trade offer was already answered or no longer exists.";
export const TRADE_OFFER_INVALID_MESSAGE = "Invalid trade offer.";
export const TRADE_OFFER_GUEST_KEY_MESSAGE = "Missing or invalid guest key.";
export const TRADE_OFFER_GUEST_LIMIT_MESSAGE = "You have too many open trade offers on this link.";
export const TRADE_OFFER_WANTED_NOT_FOUND_MESSAGE = "A card you asked for is no longer available.";
export const TRADE_OFFER_OFFERED_NOT_FOUND_MESSAGE = "A card you offered couldn't be found.";
export const TRADE_OFFER_OWN_ORG_MESSAGE = "You can't send a trade offer to your own organization.";
export const TRADE_OFFER_UNKNOWN_GAME_MESSAGE = "Unknown game.";
export const TRADE_OFFERS_NOT_ALLOWED_MESSAGE = "Trade offers can only be sent from a trade link.";
export const TRADE_OFFER_NOT_FOUND_MESSAGE = "This trade offer no longer exists.";
export const TRADE_OFFER_NOTHING_TO_PICK_MESSAGE = "This trade offer has no cards left to pick.";
export const TRADE_OFFER_INVALID_ACCEPT_MESSAGE = "Invalid trade offer answer.";
export const TRADE_OFFER_INVALID_PICKED_MESSAGE = "Invalid list of picked cards.";
export const TRADE_OFFER_CLAIM_RATE_LIMITED_MESSAGE = "Too many attempts to link trade offers. Try again in a minute.";
export const TRADE_OFFER_CLAIM_RATE_LIMIT_REQUESTS = 10;
export const TRADE_OFFER_CLAIM_RATE_LIMIT_WINDOW_MS = 60_000;
export const TRADE_OFFER_CLAIM_RATE_LIMIT_SWEEP_SIZE = 10_000;

export const TRADE_OFFER_PENDING_PER_ORG_HOURLY_MAX = 50;
export const TRADE_OFFER_PENDING_PER_ORG_WINDOW_MS = 60 * 60 * 1000;

export const OWNER_TRADE_OFFERS_CACHE_TTL_MS = 30_000;
export const OWNER_TRADE_OFFERS_CACHE_MAX_ENTRIES = 1_000;
