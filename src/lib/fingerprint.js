/**
 * Fingerprint template extraction + matching (Disabled).
 */

export const DEFAULT_MIN_SCORE = 40;

export function getMinScoreThreshold() {
  return DEFAULT_MIN_SCORE;
}

export async function extractTemplate() {
  return null;
}

export async function matchFingerprint() {
  return { best: null, matched: null };
}

export async function matcherHealth() {
  return { ok: false, message: "Fingerprint features are disabled in this project.", mode: "disabled" };
}

export function getFingerprintMatcherMode() {
  return "disabled";
}
