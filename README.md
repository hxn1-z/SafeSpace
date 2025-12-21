# SafeSpace

Node/Express backend at the repo root, Vite/React frontend in `client/`.

## Backend
- Install deps: `npm install`
- Run server: `npm run dev` (or `npm start`)

The server listens on port 5000 and serves the built frontend from `client/dist`.

## Frontend
- `cd client`
- `npm install`
- `npm run dev` (Vite dev server)
- `npm run build` (outputs `client/dist`)

## Data storage
- `users.json`, `conversations.json`, `reset_tokens.json`
- `messages.json` is legacy and seeds the global chat once.
