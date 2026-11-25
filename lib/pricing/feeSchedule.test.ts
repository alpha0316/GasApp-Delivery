import { deliveryFeeForDistanceKm, PLATFORM_FEE_BY_SIZE } from './feeSchedule';

describe('PLATFORM_FEE_BY_SIZE', () => {
  it('matches the fee schedule by cylinder size', () => {
    expect(PLATFORM_FEE_BY_SIZE.small).toBe(500);
    expect(PLATFORM_FEE_BY_SIZE.medium).toBe(800);
    expect(PLATFORM_FEE_BY_SIZE.large).toBe(1200);
  });
});

describe('deliveryFeeForDistanceKm', () => {
  it('matches the fee schedule by distance tier', () => {
    expect(deliveryFeeForDistanceKm(0)).toBe(800);
    expect(deliveryFeeForDistanceKm(3)).toBe(800);
    expect(deliveryFeeForDistanceKm(3.1)).toBe(1300);
    expect(deliveryFeeForDistanceKm(6)).toBe(1300);
    expect(deliveryFeeForDistanceKm(6.1)).toBe(1800);
    expect(deliveryFeeForDistanceKm(10)).toBe(1800);
    expect(deliveryFeeForDistanceKm(10.1)).toBe(2500);
    expect(deliveryFeeForDistanceKm(25)).toBe(2500);
  });
});
