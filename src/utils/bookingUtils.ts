export const calculateTotal = (ticketPrice: number, seatCount: number): number => {
  if (ticketPrice < 0 || seatCount < 0) return 0;
  return ticketPrice * seatCount;
};

export const findConflictingSeats = (requestedSeats: string[], existingBookings: any[]): string[] => {
  const booked = new Set<string>();
  
  existingBookings.forEach(booking => {
    if (booking.seatIds && Array.isArray(booking.seatIds)) {
      booking.seatIds.forEach((id: string) => booked.add(id));
    }
  });

  return requestedSeats.filter(id => booked.has(id));
};
