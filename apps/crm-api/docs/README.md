# CRM API documentation

The CRM API is the Express 5/TypeScript business API for the active CRM V1
application. It owns request validation, CRM workflows, application roles,
company access checks, audit logging, and persistence through Prisma.

## Code organization

- `src/routes/` — HTTP route registration and middleware boundaries
- `src/controllers/` — request/response handling
- `src/services/` — CRM business operations
- `src/schemas/` — Zod input validation
- `src/middleware/` — authentication, development proxy, rate limiting, and errors
- `src/jobs/` — session cleanup and analytics synchronization
- `prisma/` — schema, migrations, and seed data

## Development

From the repository root:

```bash
pnpm install
docker compose up -d postgres timescaledb redis authelia traefik mailpit
pnpm --filter @tazamatech/crm-api dev
```

See the repository [development setup](../../../docs/development/setup.md) and
[commands](../../../docs/development/commands.md).

## Detailed documentation

- [Business logic](./business-logic.md)
- [Database and tenant isolation](./database.md)
- [Testing](./testing.md)
- [System architecture](../../../docs/architecture/system-architecture.md)
- [Security architecture](../../../docs/architecture/security.md)
