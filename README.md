# BookMyShow Replica

A small full-stack cinema booking flow with public entry, strict OTP sign-in, backend-seeded discovery, interactive three-seat selection, dummy Card/UPI checkout, and transactional SQLite confirmations.

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

1. Start on the public landing page and select **Book tickets** or **Login**.
2. Enter exactly 10 numeric mobile digits, then enter demo OTP `1234`.
3. Choose a backend-served movie and one of its mapped theatres.
4. Select exactly three distinct available seats from the labelled grid; the total updates at Rs.150 per seat.
5. Choose Card (13–19 digits with Luhn validation) or UPI (independent of Card validation). Payment values are never submitted.
6. Select **Pay** and wait two seconds for the persisted confirmation response.

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
- `POST /api/auth/login` — `{ mobileNumber }`, where `mobileNumber` is exactly 10 numeric digits
- `POST /api/auth/verify` — `{ mobileNumber, otp: "1234" }`
- `GET /api/movies`
- `GET /api/theatres?movieId=1`
- `POST /api/bookings` — `{ mobileNumber, movieId, theatreId, seats: ["B2","B3","B4"], paymentMethod: "CARD"|"UPI", totalPrice: 450 }`; accepts exactly three distinct available seat labels and a non-negative calculated total
- `GET /api/bookings/:bookingId` — retrieves a committed confirmation for reload recovery.

A successful booking returns `201` only after SQLite commits. Invalid booking details return `400 INVALID_BOOKING`; missing users, entities, or movie-theatre mappings return `404 ENTITY_NOT_FOUND`; unexpected write errors return `500 BOOKING_WRITE_FAILED` after rollback.

## Production-style compose run

```bash
docker compose up --build
```

The frontend is served at `http://localhost:3000` and proxies same-origin `/api` traffic internally to `http://backend:4000`. The backend stores SQLite at `/data/bookmyshow.db`, backed by the named `sqlite-data` Docker volume, so data survives container recreation.

SQLite is a durable embedded database with a single-writer model. This replica deliberately uses `BEGIN IMMEDIATE` for booking writes; it is suitable for a small single-writer deployment but production scale needs backup/restore planning, locking/observability, and likely a server database for high concurrent write volume. Provide a production-specific long JWT signing secret and external TLS/reverse-proxy configuration before public deployment.
