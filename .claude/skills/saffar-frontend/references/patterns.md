# Saffar Frontend — Recurring Patterns

## Axios Instance Usage

Always import from `src/api/axios.ts`; the instance attaches the JWT automatically.

```ts
import { api } from "./axios";
const { data } = await api.get<Ride[]>("/api/ride");
```

Never create a new `axios` instance inside a page.

## Typed API Wrapper

```ts
// src/api/api.ts
import { api } from "./axios";
import type { Ride, CreateRideRequest } from "../types/ride";

export async function listRides(): Promise<Ride[]> {
  const { data } = await api.get<Ride[]>("/api/ride");
  return data;
}

export async function createRide(body: CreateRideRequest): Promise<Ride> {
  const { data } = await api.post<Ride>("/api/ride", body);
  return data;
}
```

## Reading Auth from Context

```tsx
import { useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";

const { user, token, login, logout } = useContext(AuthContext);
// user: { userId, name, email, role: "Admin" | "Driver" | "Passenger" } | null
```

## Role-Restricted Route

```tsx
// src/routes/AppRoutes.tsx
<Route element={<ProtectedRoute allowedRoles={["Driver"]} />}>
  <Route path="/driver/rides/new" element={<CreateRide />} />
</Route>
```

Multiple roles:

```tsx
<ProtectedRoute allowedRoles={["Driver", "Admin"]} />
```

## Toast Feedback

```tsx
import toast from "react-hot-toast";

try {
  await createRide(body);
  toast.success("Ride created");
} catch (err) {
  toast.error("Could not create ride");
}
```

## Map Picker Usage

```tsx
import MapPicker from "../../components/MapPicker";

<MapPicker
  onPick={(coords) => setLocation(coords)}
  initial={{ lat: 24.8607, lng: 67.0011 }}
/>
```

The Google Maps API key is read from `VITE_GOOGLE_MAPS_API_KEY` in `.env`.

## Typed Forms (without a form library)

Keep controlled state typed — extract an interface, don't use `any`.

```ts
interface CreateRideForm {
  origin: string;
  destination: string;
  departureAt: string;
  seats: number;
  pricePerSeat: number;
}
const [form, setForm] = useState<CreateRideForm>({ /* ... */ });
```

## Env Variable Access

```ts
const apiUrl = import.meta.env.VITE_API_URL;
```

All Vite env vars must be prefixed `VITE_` to be exposed to the browser.
