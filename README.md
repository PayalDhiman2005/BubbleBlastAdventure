# Bubble Blast Adventure

An original bubble-shooter web game built with React + Vite and Node.js + Express. The client is playable locally without a database; the server provides JWT authentication, player progress, sessions, and leaderboard APIs when MongoDB is configured.

## Requirements
- Node.js 20+
- MongoDB (optional for persistent accounts/progress)

## Run the game
Open a terminal in `client`:
```bash
npm install
cp .env.example .env
npm run dev
```
Open the URL printed by Vite (normally http://localhost:5173). The client includes local guest progress and can be played without the backend.

## Run the API (optional)
Open another terminal in `server`:
```bash
npm install
cp .env.example .env
npm run dev
```
Set `MONGODB_URI` and a long random `JWT_SECRET` in `server/.env`. API runs on http://localhost:5000.

## Environment variables
Client `.env`:
- `VITE_GAME_NAME` — title displayed throughout the app (default: BUBBLE BLAST ADVENTURE)
- `VITE_API_URL` — API base URL (default: http://localhost:5000/api)

Server `.env`:
- `GAME_NAME` — server-side game identity
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — private signing secret (never expose this in VITE variables)
- `PORT` — API port

Frontend name changes require restarting the dev server; production builds must be rebuilt/redeployed.

## Gameplay
- Mouse/touch aiming, dotted trajectory and wall-bounce preview
- Hex-row bubble board, collision attachment, connected match-3 BFS
- Floating-bubble detection and falling animation
- Controlled bubble queue, current/next preview, limited shots
- 40 data-driven levels, sequential unlocks, score and 1–3 stars
- Bomb and rainbow boosters, hint, undo, pause/restart
- Rescue goals on selected levels, combos, particles and synthesized audio
- Local progress persistence and responsive layout

## API
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/levels`, `GET /api/levels/:id`
- `POST /api/games/start`, `POST /api/games/complete`, `GET /api/games/history`
- `GET /api/player/progress`
- `GET /api/leaderboard`

## Notes / limitations
This is a starter implementation, not a production-certified anti-cheat system. The API validates session ownership, level, shots and plausible score ranges, but authoritative replay simulation would be needed for strong cheat resistance. The optional backend requires MongoDB. No copyrighted reference-game artwork, music, or characters are included; audio is synthesized in-browser.
