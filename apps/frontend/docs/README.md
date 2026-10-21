# AutoBridge CRM frontend

The frontend is a React, TypeScript, and Vite CRM client. It communicates
with the Express API using the application session.

## Development

From the frontend directory:

```bash
npm ci
npm run dev
```

The Vite development server normally runs at `http://127.0.0.1:5173`.

## Stack and structure

- React 19 with React Router 7
- TypeScript and Vite
- TanStack Query for server state
- Zustand for session and UI state
- React Hook Form and Zod for forms and validation
- Tailwind CSS, Radix/shadcn-style components, MUI charts, and Lucide icons

```text
src/
├── app/          providers, router, global stores, authentication
├── components/   layouts, shared components, and UI primitives
├── features/     CRM feature modules and API hooks/services
├── pages/        route-level screens
├── lib/          HTTP client, configuration, query client, utilities
├── services/     legacy/shared API modules still used by some features
└── types/        frontend domain types
```

## Authentication integration

The current login page uses the API session and route guards. Other legacy
workflows remain under refactor.

## Configuration

The frontend reads Vite variables from `apps/frontend/.env`:

- `VITE_API_URL` — CRM API base URL

Do not commit secrets or environment files.

## Current limitations

- Development startup is supported.
- Production deployment and end-to-end authentication checks remain pending.
- Mobile responsiveness and accessibility/performance improvements remain an
  active roadmap rather than completed guarantees.

See [frontend architecture](./architecture.md) and the [UX roadmap](./ux-roadmap.md).
