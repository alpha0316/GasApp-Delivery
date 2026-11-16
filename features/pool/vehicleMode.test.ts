import { riderModeFor } from './vehicleMode';

describe('riderModeFor', () => {
  it('puts motorbike and bicycle riders in single-order mode', () => {
    expect(riderModeFor('motorbike')).toBe('single');
    expect(riderModeFor('bicycle')).toBe('single');
  });

  it('puts tricycle and car riders in batch mode', () => {
    expect(riderModeFor('tricycle')).toBe('batch');
    expect(riderModeFor('car')).toBe('batch');
  });

  it('defaults to single mode before a vehicle is chosen', () => {
    expect(riderModeFor(undefined)).toBe('single');
  });
});
