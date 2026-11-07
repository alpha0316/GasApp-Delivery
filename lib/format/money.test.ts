import { formatMinor } from './money';

describe('formatMinor', () => {
  it('formats pesewas as a decimal string', () => {
    expect(formatMinor(12000)).toBe('120.00');
    expect(formatMinor(1005)).toBe('10.05');
    expect(formatMinor(7)).toBe('0.07');
    expect(formatMinor(0)).toBe('0.00');
  });

  it('keeps the sign of a negative amount', () => {
    expect(formatMinor(-250)).toBe('-2.50');
  });
});
