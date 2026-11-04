# DriveEase — Full-Stack Car Rental Website

```
driveease-fullstack/
├── frontend/          → index.html, style.css, script.js (already wired to the API)
└── backend/           → Node.js + Express + MySQL API
```

## Quick start (run everything together, one server)

The backend can serve the frontend itself, so you only need ONE process:

```bash
cd backend
npm install
cp .env.example .env      # fill in your MySQL credentials + a JWT_SECRET
mysql -u root -p < schema.sql
npm start
```

Open **http://localhost:5000** in your browser — that's the whole site,
frontend and API together on the same port. No CORS setup needed in this mode.

## Alternative: run frontend and backend separately

Useful if you want to deploy the frontend to Netlify/Vercel/GitHub Pages and
the backend to Render/Railway.

1. Start the backend as above (`npm start` inside `backend/`).
2. Open `frontend/index.html` directly, or serve it with any static server
   (e.g. VS Code's "Live Server" extension).
3. In `frontend/script.js`, make sure `API_BASE` points at wherever the
   backend actually runs, e.g.:
   ```js
   const API_BASE = "http://localhost:5000/api";
   // or, once deployed:
   const API_BASE = "https://your-backend.onrender.com/api";
   ```
4. In `backend/.env`, set `CLIENT_ORIGIN` to the frontend's URL so CORS
   allows it (e.g. `https://your-site.netlify.app`).

## What's included

- **Frontend**: the full DriveEase UI (fleet browsing, compare, wishlist,
  Smart Match quiz, price calculator, booking, ID verification, chatbot,
  accessibility panel, calendar) — already calling the backend API with a
  graceful fallback to local demo mode if the API is offline.
- **Backend**: REST API with MySQL — signup/login (JWT + bcrypt), car
  listing/search, Smart Match, wishlist, bookings with server-verified
  pricing, promo codes, and ID-proof upload/verification (ID numbers are
  hashed, never stored in plain text).

See `backend/README.md` for the full API reference and deployment options.

## Fixes in this version (login / backend not working)

- Added missing `.env.example` + a ready `.env` (JWT_SECRET was undefined, so login/signup crashed).
- `.env` → just set `DB_PASSWORD` to your MySQL password.
- Frontend `API_BASE` now auto-uses the same server (no more wrong URL).
- `/api/health` now shows DB status; server logs MySQL problems at startup.
- Added missing `seed.js` (`npm run seed` creates DB + tables + cars).
- Schema no longer duplicates cars on re-run; ratings return as numbers.
- Clean errors for bad uploads, invalid wishlist car, bad booking dates.
- Emails are trimmed/lower-cased so login is not case-sensitive.
