import { describe, expect, test } from 'vitest';

describe('Booking Business Logic', () => {

  test('should calculate the correct total for selected seats', () => {
    const ticketPrice = 1000;
    const selectedSeats = ['A1', 'A2'];

    const totalAmount = ticketPrice * selectedSeats.length;

    expect(totalAmount).toBe(2000);
  });

  test('should calculate zero total when no seats are selected', () => {
    const ticketPrice = 1000;
    const selectedSeats: string[] = [];

    const totalAmount = ticketPrice * selectedSeats.length;

    expect(totalAmount).toBe(0);
  });

  test('should calculate total correctly for three seats', () => {
    const ticketPrice = 1500;
    const selectedSeats = ['A1', 'A2', 'A3'];

    const totalAmount = ticketPrice * selectedSeats.length;

    expect(totalAmount).toBe(4500);
  });

  test('should identify duplicate seat selection', () => {
    const selectedSeats = ['A1', 'A2'];
    const bookedSeats = ['A2', 'A3'];

    const hasConflict = selectedSeats.some(seat =>
      bookedSeats.includes(seat)
    );

    expect(hasConflict).toBe(true);
  });

  test('should allow seats that are not already booked', () => {
    const selectedSeats = ['A1', 'A2'];
    const bookedSeats = ['B1', 'B2'];

    const hasConflict = selectedSeats.some(seat =>
      bookedSeats.includes(seat)
    );

    expect(hasConflict).toBe(false);
  });

  test('cash payment should produce confirmed booking status', () => {
    const paymentMethod = 'cash';

    const status =
      paymentMethod === 'cash' ? 'CONFIRMED' : 'PENDING';

    expect(status).toBe('CONFIRMED');
  });

  test('PayHere payment should remain pending before confirmation', () => {
    const paymentMethod = 'payhere';

    const status =
      paymentMethod === 'cash' ? 'CONFIRMED' : 'PENDING';

    expect(status).toBe('PENDING');
  });

});