# CRM frontend architecture

## Implemented

The frontend uses a feature-oriented React structure:

- `app/` provides providers, routing, global state, and authentication helpers.
- `features/` contains CRM-specific components, hooks, services, types, and
  query keys for customers, leads, quotations, interactions, call planning,
  analytics, audit logs, and administration.
- `pages/` provides route-level screens and composes feature components.
- `components/` contains shared layout, form, feedback, error, and UI
  primitives.
- `lib/http.ts` provides the native fetch-based HTTP client with API URL
  handling, credential defaults, query normalization, trusted-origin checks,
  and normalized errors.

React Router routes are lazy-loaded and use `Suspense` fallbacks. Protected and
guest route components enforce the frontend navigation boundary, while the API
remains authoritative for authorization.

TanStack Query is used broadly for server data and invalidation. Zustand holds
session and UI state, including sidebar/theme state and the current frontend
authentication state. Forms use React Hook Form and Zod where implemented.

## Authentication boundary

The normal session path is:

```text
Traefik → Authelia → CRM API → frontend /api/user/me
```

The frontend does not establish tenant authorization itself. It displays and
navigates based on the authenticated user returned by the API. Admin-only
routes add a frontend guard for UX, but server-side role and company checks are
required for security.

The repository also includes direct Authelia first-factor, OTP, user-info,
password-reset, and logout service methods. These support the custom auth UI
but create a second authentication surface; their final V1 role remains under
review.

## Partially implemented

- The feature structure is in active use, but some older modules remain under
  `src/services/` and are not yet fully normalized into feature services.
- The frontend has responsive hooks and adaptive components, but the complete
  CRM screen and dialog set is not yet verified on mobile.
- Analytics screens and query hooks exist, while production deployment and
  end-to-end authentication verification remain incomplete.
- The production TypeScript/build path is not currently a validated release
  path.

## Planned

- Complete authentication-surface simplification after all required flows are
  mapped and tested.
- Finish mobile/responsive coverage and accessibility review.
- Resolve frontend production build/type issues and validate container output.
- Add future AI lead-scoring screens only after the backend ML contract exists.

Older documents describing JWT refresh-token ownership, mandatory Axios
interceptors, or a generic future feature checklist are archived and are not
current architecture requirements.
