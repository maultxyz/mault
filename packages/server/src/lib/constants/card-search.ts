export const CARD_API_USER_AGENT = "MagicVault/1.0";

export const CARD_API_HEADERS: Record<string, string> = {
  "User-Agent": CARD_API_USER_AGENT,
  Accept: "application/json",
};

// Softmax temperature over the nearest candidates' similarities. At 0.05 a
// 0.05 lead over the runner-up reads as ~73% confidence, 0.1 as ~88% and
// 0.2 as ~98%. Lower is more decisive, higher more hedged.
export const MATCH_CONFIDENCE_TEMPERATURE = 0.05;
