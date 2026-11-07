# Waimea WaveCast — Frontend

**React + TypeScript + Vite**, deployed to **Google Cloud Run** at `https://waimea.liems.io.vn`.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

For local dev, change `VITE_API_BASE_URL` in `.env` to `/api/v1` to use the Vite proxy to `http://127.0.0.1:8000`.

## Production

- Dockerfile is multi-stage (Node build → Nginx static server, port 8080).
- API base URL is built into the JS bundle via `VITE_API_BASE_URL`.
- GitHub CI runs typecheck and build; deployment workflow is a template and must be configured first.
- The initial UI shows a legitimate empty state until Backend ingestion is implemented.
- See `docs/deployment.md` and `docs/api-contract.md`.
