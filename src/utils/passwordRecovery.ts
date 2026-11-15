import { toAsciiDigits } from './phone';

export const recoveryChannelLabels = { sms: 'پیامک', telegram: 'تلگرام', eitaa: 'ایتا' } as const;
export type RecoveryChannel = keyof typeof recoveryChannelLabels;

export function parseRecoveryChannel(value: unknown): RecoveryChannel | null {
  if (value === undefined) return 'sms';
  return value === 'sms' || value === 'telegram' || value === 'eitaa' ? value : null;
}

export function normalizeRecoveryIdentifier(value: unknown): string {
  return toAsciiDigits(value).replace(/[\s()-]/g, '');
}

export function isValidRecoveryIdentifier(identifier: string, channel: RecoveryChannel): boolean {
  return /^09\d{9}$/.test(identifier) || (channel !== 'sms' && /^[1-9]\d{0,19}$/.test(identifier));
}
