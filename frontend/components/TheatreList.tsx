'use client';

import React from 'react';
import type { Theatre } from '../lib/api';

interface TheatreListProps {
  theatres: Theatre[];
  onSelect: (theatre: Theatre) => void;
}

/** Render mapped theatre choices or a clear no-availability state. */
export function TheatreList({ theatres, onSelect }: TheatreListProps) {
  if (theatres.length === 0) {
    return <p className="message message-status" role="status">No theatres are available for this movie yet. Please choose another movie.</p>;
  }
  return (
    <ul className="theatre-list" aria-label="Available theatres">
      {theatres.map((theatre) => (
        <li key={theatre.id} className="theatre-card">
          <div><p className="eyebrow">Hyderabad</p><h2>{theatre.name}</h2></div>
          <button type="button" onClick={() => onSelect(theatre)} aria-label={`Choose ${theatre.name}`}>
            Select theatre
          </button>
        </li>
      ))}
    </ul>
  );
}
