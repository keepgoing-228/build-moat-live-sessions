# QR Code Generator — Frontend

React + Vite + TypeScript UI for the FastAPI backend in `../backend/`.

## Run

The backend must be running first on port 8080:

```bash
cd ../backend
uv run fastapi dev --host 0.0.0.0 --port 8080
```

Then in this directory:

```bash
npm install
npm run dev
```

Open http://localhost:5173.

Vite's dev server proxies `/api/*` and `/r/*` to `http://localhost:8080`, so the
frontend code uses relative paths and no CORS configuration is needed on the
backend.

## Routes

| Path | Purpose |
|---|---|
| `/` | Create a new QR code |
| `/qr` | Paginated list of every QR code in the database |
| `/qr/:token` | View metadata, edit URL/expiration, delete |
| `/qr/:token/analytics` | Total scans + per-day bar chart |

## Stack

- React 19 + TypeScript
- Vite (dev server + build)
- Tailwind CSS v3
- React Router v7
- Recharts (analytics chart)

## Layout

```
src/
  api/client.ts       fetch wrappers + ApiError
  types.ts            shared TS types (mirror backend schemas)
  pages/              one component per route
  components/         shared presentational pieces
  App.tsx             router + top nav
  main.tsx            React entry
  index.css           Tailwind directives
```

`api/client.ts` is the only file that calls `fetch`. Pages own their data
fetching and local state; components are prop-driven.

## Build

```bash
npm run build     # type-check + production build into dist/
npm run preview   # serve the dist/ output
```
