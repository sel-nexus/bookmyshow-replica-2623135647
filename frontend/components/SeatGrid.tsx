'use client';

import React from 'react';

interface SeatGridProps { seats: string[]; totalPrice: number; onToggleSeat: (seat: string) => void; }
const seats = ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4', 'C5'];
const unavailableSeats = new Set(['A5', 'C1']);

/** Render accessible, individually selectable seats with an exact-three limit. */
export function SeatGrid({ seats: selectedSeats, totalPrice, onToggleSeat }: SeatGridProps) {
  return <section className="seat-grid" aria-labelledby="seat-grid-title"><div><p className="eyebrow">Step 1 · Seating</p><h2 id="seat-grid-title">Choose your three seats</h2><p>Select or deselect seats. You can continue only with exactly three.</p></div><div className="seats" aria-label="Available seats">{seats.map((seat) => { const selected = selectedSeats.includes(seat); const unavailable = unavailableSeats.has(seat); return <button type="button" key={seat} aria-pressed={selected} disabled={unavailable || (!selected && selectedSeats.length === 3)} className={`seat${selected ? ' seat-selected' : ''}`} onClick={() => onToggleSeat(seat)}>Seat {seat}</button>; })}</div><p className="selection-summary" role="status">{selectedSeats.length ? `Selected seats: ${selectedSeats.join(', ')} · Rs.${totalPrice}` : 'No seats selected yet.'}</p></section>;
}
