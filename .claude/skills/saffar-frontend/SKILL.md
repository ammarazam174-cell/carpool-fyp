---
name: saffar-frontend
description: |
  Guides React 18 + TypeScript development on the Saffar carpooling web app.
  This skill should be used when adding, modifying, or debugging features
  under `Frontend/saffar-web/` — including pages, routes, API wrappers, auth
  context, role-based guards, or Google Maps / Firebase integrations.
  Encodes project conventions (axios wrapper with JWT interceptor,
  `ProtectedRoute` role guards, TailwindCSS-only styling, typed API layer in
  `src/api/api.ts`) so new code stays consistent with existing patterns.
---

# Saffar Frontend — React/TypeScript Specialist

Guide for implementing features on the **Saffar** carpooling web app.

## Scope

- **In scope**: pages, routing, typed API wrappers, auth context, role guards, map/location UI, toast UX, Tailwind styling under `Frontend/saffar-web/`.
- **Out of scope**: backend work (use `saffar-backend`), mobile app, payment UI (no gateway integrated yet).

## Stack at a Glance

- React 18 + TypeScript + Vite 6 + TailwindCSS 3 + React Router v6
- Axios with JWT interceptor, `react-hot-toast`, Firebase (FCM), `@react-google-maps/api`
- Dev server: `http://localhost:5173` — API base URL from `VITE_API_URL` in `.env`

## Before Implementation

Gather context before writing code.

| Source | Gather |
|--------|--------|
| **Codebase** | Read an analogous existing page/wrapper before creating a new one |
| **`src/api/api.ts`** | Check whether a matching API wrapper already exists; extend rather than duplicate |
| **`src/routes/AppRoutes.tsx`** | Confirm the route you plan to add doesn't collide |
| **Conversation** | User's specific UX and role requirements |
| **Skill References** | `references/patterns.md` for recurring snippets |
| **CLAUDE.md** | Project-level conventions — always defer to these |

## Required Clarifications

Ask before implementing when any of these is unclear:

1. **Which role(s)** can see this page/component? (`Admin`, `Driver`, `Passenger`)
2. **Which backend endpoint(s)** does it call? Confirm path, verb, request/response shape.
3. **Entry point** — how does the user reach this? (nav link, deep link, post-action redirect)

## Optional Clarifications

Ask only if relevant:

4. Empty / loading / error UI expectations.
5. Should success/failure fire a toast?

Note: Avoid asking too many questions in a single message.

## Key File Locations

| Concern | Path |
|---------|------|
| Auth state (JWT decode, login/logout) | `Frontend/saffar-web/src/auth/AuthContext.tsx` |
| All typed API calls | `Frontend/saffar-web/src/api/api.ts` |
| Axios instance + JWT interceptor | `Frontend/saffar-web/src/api/axios.ts` |
| Route definitions | `Frontend/saffar-web/src/routes/AppRoutes.tsx` |
| Role-based route guard | `Frontend/saffar-web/src/routes/ProtectedRoute.tsx` |
| Auth service (login/signup helpers) | `Frontend/saffar-web/src/services/authService.ts` |
| TypeScript types | `Frontend/saffar-web/src/types/` |
| Map component | `Frontend/saffar-web/src/components/MapPicker.tsx` |
| Pages by role | `Frontend/saffar-web/src/pages/driver/`, `src/pages/passenger/`, `src/pages/admin/` |

## Must Follow

- [ ] All API calls go through `src/api/api.ts` — add a typed wrapper function there; never call `axios` directly from a page.
- [ ] Read auth from `useContext(AuthContext)` — gives `{ user, token, login, logout }`. `user` has `role`, `userId`, `name`, `email`.
- [ ] Register new routes in `AppRoutes.tsx`; wrap role-restricted routes with `<ProtectedRoute allowedRoles={["Driver"]} />`.
- [ ] Style with TailwindCSS utility classes. Avoid inline `style={{}}`.
- [ ] Use `toast.success()` / `toast.error()` from `react-hot-toast` for feedback.
- [ ] Define types/interfaces in `src/types/` and import them — never use `any`.

## Must Avoid

- Calling `axios` directly inside a page/component (must go through `src/api/api.ts`).
- Reading the token manually from `localStorage` — use `AuthContext`.
- Adding a protected page without `<ProtectedRoute allowedRoles={[...]} />`.
- `any` types — extract an interface to `src/types/` instead.
- Inline `style={{}}` — convert to Tailwind utility classes.
- Role comparisons with wrong casing (backend expects `"Admin"`, `"Driver"`, `"Passenger"`).

## Workflow: Add a New Page

1. Create `src/pages/<role>/<PageName>.tsx`.
2. Add the typed API wrapper in `src/api/api.ts`.
3. Define/extend any types in `src/types/`.
4. Register the route in `src/routes/AppRoutes.tsx`, wrapped with `<ProtectedRoute allowedRoles={[...]}>` if role-restricted.
5. Add a nav link in the relevant layout/sidebar (match existing pattern).
6. Handle loading / empty / error states with toasts or inline UI.
7. `npm run dev`, verify in the browser for all relevant roles.

## Workflow: Add a New API Wrapper

1. Confirm the endpoint path, verb, and DTOs from the backend controller.
2. Add request/response interfaces in `src/types/` (or reuse existing).
3. Add the function in `src/api/api.ts` using the configured axios instance from `src/api/axios.ts` (interceptor attaches the JWT).
4. Export it; import from pages.

## Run & Build

```bash
cd Frontend/saffar-web
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

## Examples

### Good — typed wrapper, context-based auth, Tailwind, guarded route

```ts
// src/api/api.ts
import { api } from "./axios";
import type { Booking, CreateBookingRequest } from "../types/booking";

export async function createBooking(body: CreateBookingRequest): Promise<Booking> {
  const { data } = await api.post<Booking>("/api/booking", body);
  return data;
}
```

```tsx
// src/pages/passenger/NewBooking.tsx
import { useContext } from "react";
import toast from "react-hot-toast";
import { AuthContext } from "../../auth/AuthContext";
import { createBooking } from "../../api/api";

export default function NewBooking() {
  const { user } = useContext(AuthContext);

  async function onSubmit(form: CreateBookingRequest) {
    try {
      await createBooking(form);
      toast.success("Booking created");
    } catch {
      toast.error("Could not create booking");
    }
  }

  return <form className="flex flex-col gap-3 p-4">{/* ... */}</form>;
}
```

```tsx
// src/routes/AppRoutes.tsx
<Route element={<ProtectedRoute allowedRoles={["Passenger"]} />}>
  <Route path="/bookings/new" element={<NewBooking />} />
</Route>
```

### Bad — direct axios, `any`, inline style, no guard

```tsx
import axios from "axios"; // ❌ bypasses the JWT interceptor

export default function NewBooking() {
  const token = localStorage.getItem("token"); // ❌ read through AuthContext
  async function submit(form: any) {           // ❌ no `any`
    await axios.post("http://localhost:5000/api/booking", form, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  return <div style={{ padding: 16 }} />;      // ❌ Tailwind instead
}
```

## Output Specification

When completing a frontend task, deliver:

1. **Changed files list** with paths.
2. **New route(s)** if any, with allowed roles.
3. **New API wrapper(s)** in `src/api/api.ts` with request/response types.
4. **Browser verification** — which role(s) you tested against and which flows pass.

## Output Checklist

Before reporting a task done:

- [ ] `npm run lint` is clean.
- [ ] `npm run build` succeeds.
- [ ] No direct `axios` imports in pages/components.
- [ ] No `any` types introduced.
- [ ] Role-restricted pages wrapped in `<ProtectedRoute>`.
- [ ] Tailwind used for styling (no new inline `style={{}}`).
- [ ] Manual browser check for golden path + one error path.

## Reference Resources

| Resource | URL | Use For |
|----------|-----|---------|
| React 18 | https://react.dev | Hooks, component patterns |
| React Router v6 | https://reactrouter.com/en/6 | Nested routes, guards |
| TailwindCSS 3 | https://v3.tailwindcss.com/docs | Utility classes |
| Vite 6 | https://vitejs.dev | Env vars, build config |
| `@react-google-maps/api` | https://react-google-maps-api-docs.netlify.app | Map / location picker |
| `react-hot-toast` | https://react-hot-toast.com | Toast notifications |

If a pattern isn't covered here or in `references/`, fetch the official docs above rather than guessing.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/patterns.md` | Recurring page / API / context snippets |
| `references/gaps.md` | Open work areas and deliberate non-goals |
