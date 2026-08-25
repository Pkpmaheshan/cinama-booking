import { calculateTotal, findConflictingSeats } from '../../src/utils/bookingUtils';

describe('Booking Utilities', () => {
  it('should correctly calculate ticket total price', () => {
    const total = calculateTotal(1500, 3);
    expect(total).toBe(4500);
  });

  it('should return 0 for negative values', () => {
    expect(calculateTotal(-500, 2)).toBe(0);
    expect(calculateTotal(1500, -1)).toBe(0);
  });

  it('should identify conflicting seats', () => {
    const requested = ['A1', 'A2', 'A3'];
    const existing = [
      { seatIds: ['A1', 'B1'] },
      { seatIds: ['C1'] }
    ];
    
    const conflicts = findConflictingSeats(requested, existing);
    expect(conflicts).toContain('A1');
    expect(conflicts.length).toBe(1);
  });

  it('should return empty array if no conflicting seats', () => {
    const requested = ['A2', 'A3'];
    const existing = [
      { seatIds: ['A1', 'B1'] },
      { seatIds: ['C1'] }
    ];
    
    const conflicts = findConflictingSeats(requested, existing);
    expect(conflicts.length).toBe(0);
  });
});
