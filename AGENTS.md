# Repo notes

## What this repository is

Documentation only: `README.md` (the curated list), `CONTRIBUTING.md`, `LICENSE`.
There is no application code, no build step and no dependencies of its own.

## Running it in the Base44 sandbox

`docker-compose.base44.yml` runs a single `web` service on host port 3000 using the
plain `node:22-alpine` image with the repo bind-mounted at `/app`. It exists only
so the docs can be previewed:

- `server.js` renders the Markdown files with `marked` on every request, so edits
  to `README.md` / `CONTRIBUTING.md` are picked up on reload.
- `/api/state` returns the mtimes of the tracked docs; the page polls it and
  reloads itself when a file changes. No watcher/bundler is involved.
- `node_modules` lives in a named Docker volume and `marked` is installed at
  container start, so the host checkout stays clean (`.gitignore` covers it).
- Routes: `/` (README), `/contributing`, `/license`. Relative `*.md` links in the
  Markdown are rewritten to these routes.
- `BASE44_PREVIEW_MODE` is passed through to the service but nothing currently
  depends on it.

Bring up / check:

```sh
docker compose -f docker-compose.base44.yml up -d --build
docker compose -f docker-compose.base44.yml ps
curl -s http://localhost:3000/ | head -c 200
```

No database, no migrations, no external services, no credentials required.
