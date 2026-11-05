# DIG real-data frontend release

This overlay updates only the frontend and the 8082 gateway in the existing `feishu-interface` Compose project. PostgreSQL, backend, 8000/8001 services, shared networks and volumes are retained.

Prepare a new release directory from the Git commit, copy the existing server deployment `.env` to its `deploy/` directory, and create `deploy/.env.live` with the server-only Feishu app ID/secret, app token, customer table ID and opportunity table ID. Set both files to mode 0600. Never put credentials into Git, the image build context, or `NEXT_PUBLIC` variables.

Set `DIG_FRONTEND_IMAGE=enterprise-risk-frontend:COMMIT_SHA` in the deployment environment or deployment `.env`. Build this immutable image from `src/frontend/Dockerfile`. Use the existing server Compose configuration and network:

```sh
docker compose -p feishu-interface \
  -f docker-compose.server.yml -f docker-compose.8082.yml -f docker-compose.live.yml \
  config --quiet
docker compose -p feishu-interface \
  -f docker-compose.server.yml -f docker-compose.8082.yml -f docker-compose.live.yml \
  up -d --no-deps risk-frontend risk-gateway
```

Save the original frontend image ID, gateway configuration and Compose paths before updating. Do not use `down`, `--remove-orphans`, volume removal or migrations for this frontend release. To roll back, recreate only `risk-frontend` and `risk-gateway` using the prior release's original Compose files and env. The previous image must remain available.

The new `/api/dig/` location routes to Next.js, while other `/api/` routes continue to Flask. Gateway forwards the original Host including port. Server access is explicitly limited to the configured origin `http://10.126.50.207:8082`; this is internal application access, not per-user SSO. Reject cross-origin browser requests and unrecognized hosts. Financial recognition and true cash receipts remain unconnected.

Verify page title, both real-data endpoints, the old `/api/health` endpoint, 8000/8001 reachability, frontend container health, source counts, and cross-origin denial. Also verify that the current Feishu secret does not occur in `.next/static`.
