# CRM API database

## Transactional database

PostgreSQL is the CRM source of truth. Prisma owns the application schema and
migrations across the `auth` and `crm` schemas. The `auth` schema contains
companies, CRM user records, and audit logs. The `crm` schema contains
customers, contacts, leads, quotations, call plans, and interactions.

The runtime Prisma client uses `DATABASE_URL_ADMIN` in the current schema
configuration. Treat database credentials and migration execution as
environment-specific; never copy credentials into documentation.

## Company scoping and RLS

Company is the tenant boundary. CRM records carry `company_id`, and services
apply company and role checks before reads and writes. RLS SQL is retained in
the repository for tenant-scoped tables and uses the transaction-local
`app.tenant_id` setting. RLS setup scripts and migrations must be validated
against the target database before deployment; older documents that describe
RLS as merely planned are obsolete.

Analytics queries use a separate PostgreSQL/TimescaleDB connection and set
`app.tenant_id`, `app.user_id`, and `app.is_admin` on the same transaction
before querying. Policies must continue to enforce company visibility even for
administrative analytics access.

## TimescaleDB boundary

TimescaleDB stores derived `analytics_events` and time-oriented analytics
queries. CRM actions and the synchronization job produce those events. The
authoritative customer, lead, quotation, interaction, and audit records remain
in PostgreSQL.

The analytics connection is configured through `ANALYTICS_DATABASE_URL` and
uses a dedicated pool. Analytics routes include event series, counts, heatmaps,
sales-representative performance, and summary views.

## Indexes and integrity

Prisma migrations define foreign keys, uniqueness constraints, company-scoped
indexes, relationship indexes, and soft-delete support. Add or change indexes
through Prisma migrations, and verify query changes against actual migrations
rather than relying on the archived optimization notes.

Seed and migration commands are documented in the repository
[commands runbook](../../../docs/development/commands.md).
