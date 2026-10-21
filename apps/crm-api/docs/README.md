# AutoBridge CRM API documentation

The CRM API is the Express 5/TypeScript business API for the active CRM V1
application. It owns request validation, CRM workflows, application roles,
user ownership checks and persistence through Prisma.

## Code organization

- `src/routes/` — HTTP route registration and middleware boundaries
- `src/controllers/` — request/response handling
- `src/services/` — CRM business operations
- `src/schemas/` — Zod input validation
- `src/middleware/` — authentication, rate limiting, and errors
- `prisma/automotive/` — active split schema, migrations, and development seed

## Development

From the repository root, start PostgreSQL, then run the API from its own directory:

```bash
docker compose up -d postgres
cd apps/crm-api
npm ci
npm run dev
```

See the repository [README](../../../README.md) and
[application refactor plan](../../../docs/application-refactor-plan.md) for the
current local setup and remaining work.
Run `npm run seed:dev` from `apps/crm-api` to create or refresh the local
development administrator and three sample customers.

## Detailed documentation

- [Business logic](./business-logic.md)
- [Database and ownership](./database.md)
- [Testing](./testing.md)
