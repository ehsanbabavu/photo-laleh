export const toAsciiDigits = (value: unknown): string =>
  String(value ?? '')
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

export const normalizeIranianPhone = (value: unknown): string => {
  let digits = toAsciiDigits(value).replace(/\D/g, '');

  if (digits.startsWith('0098') && digits.length === 14) {
    digits = `0${digits.slice(4)}`;
  } else if (digits.startsWith('98') && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  } else if (digits.length === 10 && digits.startsWith('9')) {
    digits = `0${digits}`;
  }

  return digits;
};

export const isValidIranianPhone = (value: unknown): boolean =>
  /^09\d{9}$/.test(normalizeIranianPhone(value));
