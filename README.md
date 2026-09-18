# BookMyShow Replica

A small full-stack cinema booking flow with OTP sign-in, backend-seeded discovery, fixed seating, payment-method selection, and transactional SQLite confirmations.

## Requirements

- Node.js 22+
- Docker Desktop (optional, for the production-style compose run)

## Install and run locally

Start each tier in its own terminal:

```bash
cd backend
npm ci
npm run dev
```

```bash
cd frontend
npm ci
# The supplied frontend/.env configures the development same-origin proxy.
npm run dev
```

Open `http://localhost:3000`. The browser always requests `/api/...` on its own origin; Next proxies to the backend during development.

## Demo journey

1. Enter any nonempty mobile number.
2. Enter OTP `1234`.
3. Choose a movie and one of its mapped theatres.
4. Select seats (always `A1`, `A2`, `A3` for `Rs.450`).
5. Choose Card or UPI. Payment entry fields are display-only and are never submitted.
6. Select **Pay Rs.450** and wait two seconds for confirmation.

## Tests and type checks

```bash
cd backend
npm run build
node node_modules/vitest/vitest.mjs run tests/booking.test.ts
node node_modules/vitest/vitest.mjs run tests/integration.test.ts

cd ../frontend
node node_modules/vitest/vitest.mjs run tests/checkout.test.tsx --environment jsdom
node node_modules/typescript/bin/tsc --noEmit
```

Run the complete browser suite against real local services with:

```bash
cd frontend
node node_modules/@playwright/test/cli.js test --config playwright.config.ts
```

## API routes

- `GET /api/health`
- `POST /api/auth/login` — `{ mobileNumber }`
- `POST /api/auth/verify` — `{ mobileNumber, otp: "1234" }`
- `GET /api/movies`
- `GET /api/theatres?movieId=1`
- `POST /api/bookings` — `{ mobileNumber, movieId, theatreId, seats: ["A1","A2","A3"], paymentMethod: "CARD"|"UPI", totalPrice: 450 }`
- `GET /api/bookings/:bookingId` — retrieves a committed confirmation for reload recovery.

A successful booking returns `201` only after SQLite commits. Invalid booking details return `400 INVALID_BOOKING`; missing users, entities, or movie-theatre mappings return `404 ENTITY_NOT_FOUND`; unexpected write errors return `500 BOOKING_WRITE_FAILED` after rollback.

## Production-style compose run

```bash
docker compose up --build
```

The frontend is served at `http://localhost:3000` and proxies same-origin `/api` traffic internally to `http://backend:4000`. The backend stores SQLite at `/data/bookmyshow.db`, backed by the named `sqlite-data` Docker volume, so data survives container recreation.

SQLite is a durable embedded database with a single-writer model. This replica deliberately uses `BEGIN IMMEDIATE` for booking writes; it is suitable for a small single-writer deployment but production scale needs backup/restore planning, locking/observability, and likely a server database for high concurrent write volume. Provide a production-specific long JWT signing secret and external TLS/reverse-proxy configuration before public deployment.
