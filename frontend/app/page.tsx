import Link from 'next/link';

/** Render the public, side-effect-free entry point for the booking journey. */
export default function LandingPage() {
  return (
    <main>
      <section className="auth-card landing-card" aria-labelledby="landing-title">
        <div className="brand">BookMyShow</div>
        <p className="eyebrow">YOUR NEXT BIG SCREEN MOMENT</p>
        <h1 id="landing-title">Movies, moments, and your perfect seats.</h1>
        <p>Discover the latest releases, choose your theatre, and reserve your show in a few clear steps.</p>
        <div className="landing-actions" aria-label="Booking actions">
          <Link className="button-primary" href="/login">Book tickets</Link>
          <Link className="button-secondary" href="/login">Login</Link>
        </div>
      </section>
    </main>
  );
}
