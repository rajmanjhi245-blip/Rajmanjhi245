# Raj Ludo Arena

Raj Ludo Arena is an original Ludo-style tournament web application prototype. It includes player registration, an owner-only admin panel, tournament creation, a playable browser board, wallet ledger flows, KYC status controls, withdrawal requests, and payment-gateway configuration placeholders.

## Important legal and product notes

This project intentionally does **not** copy Ludo King artwork, branding, code, screenshots, sounds, or proprietary assets. It also does **not** enable real-money gambling or real payouts. The wallet is a demo ledger for product testing only.

Before enabling real deposits or withdrawals, obtain legal advice and implement all requirements for your target regions, including skill-game/gambling licensing where applicable, KYC, AML, tax reporting, age gates, geo-blocking, responsible-gaming limits, fraud monitoring, payment-provider approval, and audited accounting.

## Features

- Player registration and login.
- Owner admin login with default credentials:
  - Email: `admin@raj-ludo.local`
  - Password: `ChangeMe@123`
- Admin controls for branding, announcements, maintenance mode, payment configuration, KYC verification, tournaments, and withdrawal review.
- Demo wallet with add-money and withdrawal-request flows.
- Multiplayer tournament joining and admin-launched live matches.
- Original browser-rendered board with dice rolls, turns, captures, prize settlement, and transaction ledger.

## Run locally

```bash
npm install
npm run start
```

Then open http://127.0.0.1:4173/ in your browser.

## Test

```bash
npm test
```
