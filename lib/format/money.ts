// Amounts are integer minor units (pesewas). Format with integer math only.
export function formatMinor(minor: number): string {
  const negative = minor < 0;
  const abs = Math.abs(Math.trunc(minor));
  const whole = Math.floor(abs / 100);
  const cents = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${cents}`;
}
