export const DEFAULT_NEW_USER_WALLET_CREDIT = 100_000;
export const MAX_NEW_USER_WALLET_CREDIT = 1_000_000_000;

export function normalizeNewUserWalletCredit(
  value: unknown,
  fallback = DEFAULT_NEW_USER_WALLET_CREDIT
): number {
  if (value === null || value === undefined || value === '') return fallback;

  const amount = Number(value);
  if (!Number.isFinite(amount)) return fallback;

  return Math.max(0, Math.min(MAX_NEW_USER_WALLET_CREDIT, Math.round(amount)));
}

export function getNewUserWalletCredit(settings: unknown): number {
  const value = settings && typeof settings === 'object'
    ? (settings as Record<string, unknown>).newUserWalletCredit
    : undefined;

  return normalizeNewUserWalletCredit(value);
}
