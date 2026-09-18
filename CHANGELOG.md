# Changelog

## Brownfield revision — 2026-09-18

### Added
- Public landing page with explicit Book tickets and Login navigation to the OTP journey.
- Interactive labelled seat-selection route with unavailable, selected, deselected, and exact-three states.
- Response-backed confirmation component and E2E coverage for non-default persisted seats.
- Focused frontend component, API-client, integration, and Playwright tests covering the revised journey.

### Changed
- Mobile login validation now requires exactly 10 numeric digits in both client and Express API boundaries.
- Discovery retains explicit backend movie/theatre selection and clears dependent seat state when the movie changes.
- Booking validation now accepts exactly three distinct available labels and a non-negative calculated total instead of the deprecated fixed `A1/A2/A3` and Rs.450 payload contract.
- SQLite booking persistence and confirmation now return the actual selected seats, payment method, and submitted total.
- Dummy checkout validates Card numbers with normalized 13–19 digit Luhn rules while keeping UPI independent; processing remains a two-second UI state.
- README, E2E navigation, browser-error capture, and test reports now match the revised public-to-confirmation journey.

### Verification
- Test critic passed in round 4 with score 1.00 and zero high-severity findings.
- Backend Vitest: 50 tests passed; frontend Vitest: 28 tests passed; cross-feature SQLite integration: 3 tests passed.
- All 14 Playwright scenarios passed across the final successful live runs.
- Next.js production build and `docker compose up --build -d` passed.

### Breaking changes / migration notes
- Clients must send actual three-seat selections to `POST /api/bookings`; hardcoded `A1/A2/A3` ordering is no longer required or injected.
- The displayed total is calculated from the active selection (currently Rs.150 per seat); callers must supply a non-negative integer total.
- No database schema migration was needed because the existing SQLite `seats` JSON field already supports actual seat labels.
