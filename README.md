# Frontend

React + Vite app, independently runnable and configured to call the separate Express API.

## Run

1. Install Node.js 20+.
2. Copy `.env.example` to `.env`; set `VITE_API_URL` to the backend API base, including `/api/v1` (default `http://localhost:3000/api/v1`).
3. Run `npm install`, then `npm run dev`.
4. Build for production with `npm run build`.

Configure the backend's `CLIENT_URL` to the frontend origin. The included `quick-sale-order-client` is an additional standalone Vite app; it has its own `.env.example` and README.

VITE_PORT and VITE_PREVIEW_PORT set the frontend dev and preview ports.
