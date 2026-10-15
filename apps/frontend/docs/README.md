# CRM frontend

The frontend is a React 19, TypeScript, and Vite CRM client. It communicates
with the Express CRM API and relies on the Traefik/Authelia boundary for the
authenticated session.

## Development

From the repository root:

```bash
pnpm install
docker compose up -d postgres timescaledb redis authelia traefik mailpit
pnpm --filter @tazamatech/crm-api dev
pnpm --filter @tazamatech/frontend dev
```

The Vite development server normally runs at `http://localhost:5173`.

## Stack and structure

- React 19 with React Router 7
- TypeScript and Vite
- TanStack Query for server state
- Zustand for session and UI state
- React Hook Form and Zod for forms and validation
- Tailwind CSS, Radix/shadcn-style components, MUI charts, and Lucide icons

```text
src/
├── app/          providers, router, global stores, Authelia integration
├── components/   layouts, shared components, and UI primitives
├── features/     CRM feature modules and API hooks/services
├── pages/        route-level screens
├── lib/          HTTP client, configuration, query client, utilities
├── services/     legacy/shared API modules still used by some features
└── types/        frontend domain types
```

## Authentication integration

The default direction is browser session authentication through Traefik and
Authelia. The frontend restores the session through `/api/user/me`, uses
protected and guest route guards, and redirects to Authelia for login/logout.
The code also contains a direct Authelia first-factor and OTP path for custom
authentication screens. That path remains present but is not treated as the
single verified V1 flow until the authentication-surface review is complete.

## Configuration

The frontend reads Vite variables from `apps/frontend/.env`:

- `VITE_API_URL` — CRM API base URL
- `VITE_APP_URL` — application origin used by frontend configuration
- `VITE_AUTHELIA_URL` — Authelia origin for explicit login/logout flows

Do not commit secrets or environment files.

## Current limitations

- Development startup is supported.
- The frontend production TypeScript/build path still has unresolved issues and   is not a production-readiness claim.
- Production container packaging and end-to-end production authentication remain
  pending.
- Mobile responsiveness and accessibility/performance improvements remain an
  active roadmap rather than completed guarantees.

See [frontend architecture](./architecture.md) and the [UX roadmap](./ux-roadmap.md).
