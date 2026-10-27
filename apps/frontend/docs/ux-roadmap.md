# CRM frontend UX and performance roadmap

## Current interaction decisions

CRM workflows should keep relationship creation close to the activity being
recorded:

- Select a customer before customer-scoped records.
- Load that customer's contacts and allow inline contact creation.
- Allow a general interaction without a lead or quotation.
- Offer quick lead creation when an interaction identifies a new opportunity.
- Keep validation, loading, empty, error, success, and disabled states visible
  in dialogs and multi-step forms.

These patterns support field sales work without weakening the API's required
relationships or company authorization.

## Mobile and responsive work remaining

The main unresolved areas are:

- tables that need card or controlled horizontal-scroll alternatives;
- large dialogs and multi-column forms that need mobile stacking or full-screen
  presentation;
- filters that need compact drawer/sheet behavior;
- navigation, date pickers, dropdowns, and action menus on narrow screens;
- touch target sizing, readable text, and mobile error/empty states;
- manual testing across the primary CRM pages and dialogs.

The existing roadmap is guidance for implementation, not evidence that all
listed pages or success metrics are complete.

## Verified performance direction

The frontend router uses lazy-loaded pages and `Suspense` fallbacks. Vite's
production mode can provide bundling, tree-shaking, minification, and chunking.
These are implementation characteristics, not measured Lighthouse results.

Performance checks must use a successful production build and preview server,
not the Vite development server. The production build currently has unresolved
TypeScript issues, so production performance scores remain unverified.

## Remaining performance work

- Resolve the production TypeScript/build blockers.
- Run repeatable desktop and mobile Lighthouse checks against the production
  preview or deployed build.
- Measure bundle size, route chunk loading, accessibility, layout shift, and
  interaction responsiveness before setting numeric targets.
- Add performance checks to CI only after the build and measurement process is
  stable.

Avoid treating old expected scores, bundle sizes, or claimed percentage gains as
current measurements.
