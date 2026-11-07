# Public API contracts expected from Backend

- `GET /api/v1/observations/latest` → `{status: "empty"|"ok", data_type: "observation", data: {...}|null}`
- Planned: `GET /api/v1/analytics/series`, `/trend`, `/seasonal`, `/correlation`
- Planned: `GET /api/v1/clusters`, `/predictions/tomorrow`, `/classifications/tomorrow`

All requests use HTTPS. Only public read endpoints belong in the browser. No credentials for Cloud SQL or GCS may enter the Vite bundle.
