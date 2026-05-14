import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { sendDriverLocation } from "@/api/api";

type TrackerStatus =
  | "idle"
  | "requesting-permission"
  | "permission-denied"
  | "tracking"
  | "error";

interface TrackerResult {
  status: TrackerStatus;
  lastSentAt: Date | null;
  lastError: string | null;
}

// Starts a 5-second foreground GPS loop that pushes the driver's position to
// `PUT /api/rides/{rideId}/location` while `active` is true. Stops on unmount
// or when `active` flips off.
export function useDriverLocationTracker(
  rideId: string | null,
  active: boolean,
  intervalMs: number = 5000
): TrackerResult {
  const [status, setStatus] = useState<TrackerStatus>("idle");
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Guards so late async results can't update state after the effect is torn
  // down or after the ride flips off.
  const cancelled = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!active || !rideId) {
      setStatus("idle");
      return;
    }

    cancelled.current = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      if (cancelled.current || inFlight.current) return;
      inFlight.current = true;
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        console.log(
          `[DriverTracker] rideId=${rideId} -> PUT (${lat.toFixed(5)}, ${lng.toFixed(5)})`
        );
        await sendDriverLocation(rideId, { lat, lng });
        if (cancelled.current) return;
        setLastSentAt(new Date());
        setLastError(null);
      } catch (err: any) {
        if (cancelled.current) return;
        const msg =
          err?.response?.data?.message ??
          err?.message ??
          "Could not update driver location";
        console.warn("[DriverTracker] send failed:", msg, err);
        setLastError(typeof msg === "string" ? msg : "Location update failed");
      } finally {
        inFlight.current = false;
      }
    };

    (async () => {
      setStatus("requesting-permission");
      try {
        const { status: permStatus } =
          await Location.requestForegroundPermissionsAsync();
        if (cancelled.current) return;
        if (permStatus !== "granted") {
          console.warn("[DriverTracker] permission denied:", permStatus);
          setStatus("permission-denied");
          setLastError(
            "Location permission denied. Enable location access to share your ride with passengers."
          );
          return;
        }
        setStatus("tracking");
        // Fire the first tick immediately so passengers see the driver within
        // a second, not after the first interval elapses.
        void tick();
        timer = setInterval(tick, intervalMs);
      } catch (err: any) {
        if (cancelled.current) return;
        console.error("[DriverTracker] permission/init failed:", err);
        setStatus("error");
        setLastError(err?.message ?? "Failed to start location tracking");
      }
    })();

    return () => {
      cancelled.current = true;
      if (timer) clearInterval(timer);
    };
  }, [rideId, active, intervalMs]);

  return { status, lastSentAt, lastError };
}
