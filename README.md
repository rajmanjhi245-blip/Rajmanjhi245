# Multiply Masters Academy

A complete static multiplication-learning game application with:

- Player registration and login gates
- Owner-only admin panel
- 700 different educational levels with unique worlds, missions, tips, tables, and difficulty steps
- Multiple original multiplication practice modes
- Configurable tables, coins, announcements, maintenance mode, and ad text
- Level progression with unlocks, completion tracking, knowledge tips, and enjoyable mission themes
- Rewarded ad placeholder and earnings dashboard
- Local leaderboard-style progress stored in the browser

> Note: This prototype uses browser `localStorage` so it runs anywhere without a backend. Before publishing a real money-earning app, replace local demo authentication and storage with a secure backend, server-side admin authorization, and a real ad SDK such as Google AdMob.

## Run

```bash
npm start
```

Open <http://localhost:4173>.

## Test

```bash
npm test
```

## Demo admin login

- Username: `owner`
- Password: `Owner@12345`

Change the credentials and move authentication server-side before production.
