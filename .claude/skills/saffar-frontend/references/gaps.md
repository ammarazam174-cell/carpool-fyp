# Saffar Frontend — Known Gaps & Non-Goals

These are open work areas. Don't invent solutions here without confirming scope with the user.

## Open Work

- **Payment UI** — needs integration with a payment gateway (JazzCash / Stripe). No provider chosen yet; do not stub one in.
- **Real-time ride tracking** — no WebSocket/SignalR client installed yet. Polling is acceptable as a first cut if the user agrees.
- **Admin dashboard** — currently only supports driver approval. Booking management and analytics pages remain.
- **Passenger search filters** — `PassengerDashboard` has no date, price, or rating filters.
- **Form validation** — no form library. Consider `react-hook-form` + `zod` for complex forms once the user okays it.
- **Global state** — none. If a feature needs shared state across unrelated pages, propose Zustand (lightweight) before reaching for Redux.

## Styling Drift

Some existing pages mix inline `style={{}}` with Tailwind. **New work must use Tailwind only.** When editing an old page, migrating its inline styles to Tailwind is encouraged but not required unless the user asks.

## Role Casing

Roles on the token are `"Admin" | "Driver" | "Passenger"` (PascalCase). Comparisons like `user.role === "driver"` will silently fail — always match the exact casing.

## Token Storage

The JWT is stored in `localStorage` under the key `"token"`. `AuthContext` owns read/write — do not touch `localStorage` directly from a page.
