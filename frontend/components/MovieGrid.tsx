'use client';

import React from 'react';
import type { Movie } from '../lib/api';

interface MovieGridProps {
  movies: Movie[];
  onSelect: (movie: Movie) => void;
}

/** Render accessible movie choices backed exclusively by API-provided movie records. */
export function MovieGrid({ movies, onSelect }: MovieGridProps) {
  return (
    <ul className="discovery-grid" aria-label="Available movies">
      {movies.map((movie) => (
        <li key={movie.id} className="discovery-card">
          <p className="eyebrow">Now showing</p>
          <h2>{movie.title}</h2>
          <button type="button" onClick={() => onSelect(movie)} aria-label={`Choose ${movie.title}`}>
            Choose {movie.title}
          </button>
        </li>
      ))}
    </ul>
  );
}
