# DriveEase Backend (Node.js + Express + MySQL)

This is the backend API for your DriveEase car rental frontend. It replaces
the `localStorage`-only logic in `script.js` with real endpoints backed by
MySQL: cars, login/signup, wishlist, bookings, Smart Match, the price
calculator, and identity verification (ID proof upload).

## 1. Install

```bash
cd backend
npm install
```

## 2. Set up MySQL

1. Make sure MySQL is running locally (or point to a remote instance).
2. Import the schema (creates the database, tables, and seeds the 6 demo cars):
   ```bash
   mysql -u root -p < schema.sql
   ```

## 3. Configure environment variables

```bash
cp .env.example .env   # (a ready .env is already included - just set DB_PASSWORD)
```
Edit `.env` and fill in your MySQL credentials and a random `JWT_SECRET`.

## 4. Run the server

```bash
npm start
# or, for auto-restart on changes:
npm run dev
```

The API runs at `http://localhost:5000` by default. Check it's alive:
```bash
curl http://localhost:5000/api/health
```

## API overview

| Method | Endpoint                          | Auth | Description |
|--------|------------------------------------|------|--------------|
| POST   | `/api/auth/signup`                | No   | Create account, returns `{ token, user }` |
| POST   | `/api/auth/login`                 | No   | Login, returns `{ token, user }` |
| GET    | `/api/auth/me`                    | Yes  | Restore session from token |
| GET    | `/api/cars?type=&search=&sort=`   | No   | Fleet list, filtered/sorted like the frontend |
| GET    | `/api/cars/:id`                   | No   | Single car details |
| POST   | `/api/cars/match`                 | No   | Smart Match quiz → up to 3 cars |
| GET    | `/api/wishlist`                   | Yes  | Logged-in user's saved cars |
| POST   | `/api/wishlist/:carId`            | Yes  | Toggle add/remove |
| POST   | `/api/bookings/calculate`         | No   | Server-side price + promo calculation |
| GET    | `/api/bookings`                   | Yes  | Logged-in user's bookings |
| POST   | `/api/bookings`                   | Yes  | Create a booking |
| PATCH  | `/api/bookings/:id/cancel`        | Yes  | Cancel a booking |
| POST   | `/api/verification`               | Yes  | Submit ID proof (`multipart/form-data`) |
| GET    | `/api/verification/me`            | Yes  | Logged-in user's verification status |

Auth-protected routes expect: `Authorization: Bearer <token>`.

## 5. Wiring it into your existing frontend

Your current `script.js` keeps everything in memory + `localStorage`. To
connect it to this backend, the main changes are:

1. Add a small API helper at the top of `script.js`:
   ```js
   const API_BASE = "http://localhost:5000/api";
   let authToken = localStorage.getItem("driveease_token") || null;
   async function api(path, options = {}) {
     const res = await fetch(API_BASE + path, {
       ...options,
       headers: {
         "Content-Type": "application/json",
         ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
         ...(options.headers || {}),
       },
     });
     const data = await res.json().catch(() => ({}));
     if (!res.ok) throw new Error(data.error || "Request failed");
     return data;
   }
   ```

2. Replace the hardcoded `cars` array with a fetch on load:
   ```js
   let cars = await api("/cars");
   ```

3. In `#authForm`'s submit handler, call `/api/auth/signup` or
   `/api/auth/login` instead of just closing the modal, then store
   `authToken = data.token` and `localStorage.setItem("driveease_token", data.token)`.

4. In `toggleWish`, `openBooking`'s confirm handler, and the verification
   form submit handler, call the matching endpoint above instead of writing
   straight to `localStorage`.

5. For the verification form, since it includes a file upload, submit it as
   `FormData` (not JSON) to `POST /api/verification`.

If you'd like, I can also rewrite `script.js` itself to call these endpoints
directly — just share whether you want it to fully replace the demo
(localStorage) version or fall back to it when the API is unreachable.

## Security notes

- Passwords are hashed with bcrypt — never stored in plain text.
- The Aadhaar/ID number is never stored as-is: only a SHA-256 hash (for
  duplicate checks) and the last 4 digits (for display) are saved. The
  uploaded file itself is renamed to a random UUID on disk.
- Booking totals and promo discounts are always recalculated on the server,
  so a modified client can't submit a fake price.
- For a real production deployment, route ID verification through a
  compliant identity-verification provider and store files in encrypted,
  access-controlled storage rather than the local `uploads/` folder used
  here for the demo.
