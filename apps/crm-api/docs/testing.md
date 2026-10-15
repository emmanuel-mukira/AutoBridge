# CRM API testing

## Local checks

From the repository root:

```bash
pnpm --filter @tazamatech/crm-api lint
pnpm --filter @tazamatech/crm-api build
pnpm --filter @tazamatech/crm-api seed
curl http://localhost:3000/health
```

Use the existing Prisma seed only for a disposable development database. Do
not run reset or seed commands against production data.

## Manual workflow coverage

When validating the CRM API, cover:

- authenticated session resolution through the Traefik/Authelia development
  path;
- company isolation for customers, contacts, leads, quotations, interactions,
  call plans, audit logs, and analytics;
- sales-representative ownership restrictions;
- administrator access within the authenticated company;
- lead and quotation state transitions and quotation versioning;
- call-plan completion and interaction creation;
- invite validation and user administration;
- analytics synchronization and RLS visibility.

The API uses Authelia session identity and trusted `Remote-*` headers in the
current design. Older bearer-token/JWT examples in archived test documents are
not valid test instructions.
