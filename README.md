# ColorQuest Studio

ColorQuest Studio is an original paint-by-number coloring web application inspired by common coloring-book mechanics: player registration, a protected gallery, saved coloring progress, and an owner-only admin panel for content control.

> The included artwork is original SVG line art created for this project. Do not copy third-party Google Play assets or app content into this repository unless you own the rights.

## Features

- Player registration and login.
- Owner/admin login with separate authorization checks.
- 540 original color-by-number SVG levels with numbered regions, attractive themes, and varied palettes.
- Click-to-fill gameplay, wrong-color feedback, progress meter, gallery pagination, and saved progress.
- Admin CRUD for coloring pages, including SVG markup and palette editing.
- Admin view of registered users.
- File-backed JSON database for easy local deployment.

## Run locally

```bash
npm start
```

Open <http://localhost:3000>.

Development default owner account:

- Username: `owner`
- Password: `ChangeMe123!`

For production, set these environment variables before first run:

```bash
ADMIN_USERNAME=my_owner_name ADMIN_PASSWORD='a-strong-password' npm start
```

## Test

```bash
npm test
```
