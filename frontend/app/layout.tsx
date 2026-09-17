import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BookingJourneyProvider } from '../state/BookingJourneyProvider';
import './globals.css';

/** Define metadata for the customer authentication workflow. */
export const metadata: Metadata = {
  title: 'BookMyShow Replica | Sign in',
  description: 'Securely sign in to start your cinema booking journey.',
};

/** Wrap every route in the shared booking journey provider and global styles. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BookingJourneyProvider>{children}</BookingJourneyProvider>
      </body>
    </html>
  );
}
