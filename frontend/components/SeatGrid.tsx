'use client';

import React from 'react';

interface SeatGridProps {
  seats: string[];
  totalPrice: number;
  onSelectSeats: () => void;
}

/** Show the fixed seating selection and safely repeatable selection action. */
export function SeatGrid({ seats, totalPrice, onSelectSeats }: SeatGridProps) {
  return <section className="seat-grid" aria-labelledby="seat-grid-title">
    <div><p className="eyebrow">Step 1 · Seating</p><h2 id="seat-grid-title">Your three-seat row</h2><p>Select the prescribed seats to continue with the fixed demo fare.</p></div>
    <div className="seats" aria-label="Available seats">{['A1', 'A2', 'A3'].map((seat) => <span className={seats.includes(seat) ? 'seat seat-selected' : 'seat'} key={seat}>{seat}</span>)}</div>
    <button type="button" onClick={onSelectSeats}>Select seats</button>
    <p className="selection-summary" role="status">{seats.length ? `Selected seats: ${seats.join(', ')} · Rs.${totalPrice}` : 'No seats selected yet.'}</p>
  </section>;
}
