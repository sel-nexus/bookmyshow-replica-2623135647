'use client';

import React from 'react';

/** Announce the timed, non-blocking booking processing state. */
export function ProcessingView() {
  return <section className="processing-view" aria-labelledby="processing-title"><p className="eyebrow">Step 3 · Confirming</p><h1 id="processing-title">Securing your booking…</h1><p role="status">Please keep this page open while we confirm your selected seats.</p></section>;
}
