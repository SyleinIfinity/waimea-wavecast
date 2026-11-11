# TL01 integration gateway

The Compose file builds Database API and binds Nginx only to
`127.0.0.1:8080`. `/internal/v1` is not routed through Nginx. The gateway
does not provide public TLS; put it behind the group's TLS ingress when the
other services are integrated. Set environment variables from a protected
host secret store, not a committed `.env` file.

Run `docker-compose -f deploy/integration/compose.yaml config -q` before build,
then `docker-compose -f deploy/integration/compose.yaml build` and `up -d` on
a host with Docker Engine. Check `/health/ready` against PostgreSQL and
confirm `/internal/v1` returns 404 through the gateway. Workers on the
private network should call `database-api:8000` directly with their token.

This Compose file covers TL01 only. Add the TL04/TL05 worker services and
their private URLs at integration time; do not expose their internal routes.
