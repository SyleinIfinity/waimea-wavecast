# Deploy frontend: Google Cloud Run

**Production URL:** https://waimea.liems.io.vn  
**Backend API:** https://apiwaimea.liems.io.vn/api/v1

1. Create GCP project, Artifact Registry Docker repository and a Cloud Run deploy service account.
2. Configure GitHub Actions Workload Identity Federation. Do not commit JSON key files.
3. Verify backend API responds over HTTPS and allows CORS for `https://waimea.liems.io.vn`.
4. Build React as **static files** and serve through Nginx in Cloud Run on **port 8080**.
5. `VITE_API_BASE_URL` is a **build-time** variable. The Dockerfile defaults to production hostname shown above. To change it, pass Docker build arg and build a new image.
6. Use Cloud Run's default URL first. Configure custom domain with HTTPS Load Balancer + Serverless NEG for production (or supported domain mapping for a small demo, noting its limitations).
7. Test the UI, browser Network tab, CORS and HTTP 4xx/5xx after deploy.

Cloud Run is stateless; do not store raw data, DB passwords or model files in the frontend container.
