import { isValidCancelReason } from './cancelReasons';

describe('isValidCancelReason', () => {
  it('treats vehicle fault and emergency as excused', () => {
    expect(isValidCancelReason('vehicle_fault')).toBe(true);
    expect(isValidCancelReason('emergency')).toBe(true);
  });

  it('treats everything else as unexcused', () => {
    expect(isValidCancelReason('other')).toBe(false);
  });
});
