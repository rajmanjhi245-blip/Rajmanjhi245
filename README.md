# Jigsaw Arena

Jigsaw Arena is an original full-stack jigsaw puzzle web application. It includes player registration, authenticated puzzle play, asynchronous multiplayer tournaments, rewarded-ad simulation, a coin wallet, and an owner-only admin panel.

> This project does not copy proprietary artwork, branding, layouts, screenshots, or code from any third-party game. It implements an original jigsaw experience inspired by common puzzle-game mechanics.

## Run

```bash
npm start
```

Open `http://localhost:3000`.

## Default owner login

- Username: `owner`
- Password: `Owner@12345`

For production, set these before the first run:

```bash
ADMIN_USER=my_admin ADMIN_PASS='a-strong-password' npm start
```

The app stores data in `data/db.json` by default. To use another location, set `DB_FILE=/path/to/db.json`.

## Features

- Player registration and login with PBKDF2 password hashing and HTTP-only session cookies.
- 1000 different built-in levels with strictly increasing difficulty scores, larger piece grids, and unique generated themes.
- Original canvas jigsaw board with drag-to-snap pieces, hints, shuffle, completion detection, and score submission.
- Multiplayer tournament leaderboards based on fastest completion time.
- Coin rewards for puzzle completion and rewarded ad views.
- Owner-only admin panel for settings, puzzle creation/update, tournament creation/update, user stats, and monetization totals.
- No external runtime dependencies; runs with Node.js 18+.

## Monetization note

The included ad system is a development-safe rewarded-ad simulator that records ad events and estimated revenue. Before publishing to an app store, connect an approved ad network SDK, add consent/privacy flows, and comply with local laws and platform policies.
