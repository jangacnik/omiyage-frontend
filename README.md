# Omiyage Frontend

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06b6d4?logo=tailwindcss&logoColor=white)
![Tests](https://img.shields.io/badge/tests-Vitest%20%7C%20Playwright-6e9f18)
![Docker](https://img.shields.io/badge/deploy-Docker%20%7C%20Kubernetes-2496ed?logo=docker&logoColor=white)

Web storefront for **Omiyage** (お土産, "souvenir"): browse an inventory of items, build a cart, place orders, request custom items and track shipments. Admins manage inventory, orders and shipments from the same app.

## Features

- Inventory browsing and item detail pages
- Cart and order creation, order history and detail views
- Custom item requests and combined shipment requests
- Shipment tracking
- Profile and JWT login
- Admin tools: dashboard, inventory, item templates, categories, orders, shipments, shipping rates, exchange rate and settings
- Mobile-first layout with accessible dialogs, forms and touch targets
- Empty, error and retry states on every list

## Stack and reasoning

| Concern | Choice | Why |
| --- | --- | --- |
| UI | React 19 + TypeScript | Typed components, large ecosystem |
| Build | Vite | Fast dev server and builds |
| Styling | Tailwind CSS 4 | Utility classes keep styles next to markup, no CSS sprawl |
| Routing | React Router 7 | Standard, supports route-level code splitting |
| Server state | TanStack Query | Caching, retries and loading/error states for API data |
| Client state | Zustand | Tiny store for auth and cart, no boilerplate |
| Forms | React Hook Form + Zod | Schema validation shared between types and runtime |
| Lint | Oxlint | Fast, zero-config linting in CI |
| Tests | Vitest, Testing Library, MSW, Playwright | Unit/component tests with mocked API, plus an end-to-end critical flow |
| Delivery | Docker (nginx-unprivileged), Kubernetes manifests | Small static image, runs as non-root |

## Getting started

Requires Node >= 22.12.

```sh
npm ci
npm run dev
```

Set `VITE_API_BASE_URL` to point at the [omiyage-api](../omiyage-api) backend.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | Run Oxlint |
| `npm test` | Run unit and component tests |
| `npm run test:coverage` | Tests with coverage |
| `npm run test:e2e` | Playwright end-to-end tests |

## Project layout

```
src/
  api/         API client and query hooks
  components/  Shared UI
  pages/       Route-level screens (admin/ for admin tools)
  routes/      Router and guards
  store/       Zustand stores
  lib/         Helpers
  types/       Shared types
e2e/           Playwright specs
deploy/k8s/    Kubernetes manifests
```

## Deployment

CI runs lint, tests and build on every branch. The `Dockerfile` builds the static bundle and serves it with nginx on port 8080. `VITE_API_BASE_URL` is a build argument.
