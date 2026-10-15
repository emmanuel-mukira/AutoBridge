# CRM API business logic

## Sales workflow

The active CRM workflow is:

```text
Customer → Contact → Lead → Quotation → Interaction → WON/LOST outcome
```

Customers and contacts support relationship management before a specific
opportunity exists. Leads represent opportunities and belong to a company and
customer. Quotations belong to leads and support versioning. Interactions are
linked to a customer and contact and may optionally reference a lead or
quotation.

Call plans schedule customer activity and can be marked complete. User and
administrative routes support company-scoped user provisioning, invitations,
status changes, and role changes.

## Business boundaries

- PostgreSQL records are authoritative for CRM entities and audit records.
- Every authenticated request resolves the CRM user and company from the
  Authelia identity headers and the CRM user table.
- Sales representatives are restricted by company and by the ownership rules
  implemented in the relevant services.
- Administrative operations require the `admin` Authelia group.
- Service code performs relationship and state checks before writes; Prisma
  transactions are used where a workflow needs atomic multi-record changes.
- Analytics events are derived from CRM actions and written to TimescaleDB;
  analytics does not replace transactional CRM records.

## Main routes

The API exposes authenticated routes for users, customers, contacts, leads,
quotations, interactions, call plans, audit logs, and analytics. Authentication
and role middleware are applied at route boundaries; validation schemas define
accepted request data.

Lead and quotation state transitions, assignment rules, duplicate checks,
soft-delete behavior, and audit events remain implemented in the corresponding
services and should be treated as the source of truth when this summary differs
from older planning documents.
