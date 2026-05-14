import { useEffect, useRef, useState } from "react";
import {
  getDriverLocation,
  type DriverLocationSnapshot,
} from "@/api/api";

type PollStatus = "idle" | "loading" | "polling" | "error";

interface PollResult {
  status: PollStatus;
  data: DriverLocationSnapshot | null;
  error: string | null;
  lastFetchedAt: Date | null;
}

// Polls `GET /api/rides/{rideId}/location` every `intervalMs` while `active`
// is true. Leaves state intact on transient errors so the map keeps the last
// known pin instead of flashing empty.
export function useDriverLocationPoll(
  rideId: string | null,
  active: boolean,
  intervalMs: number = 5000
): PollResult {
  const [status, setStatus] = useState<PollStatus>("idle");
  const [data, setData] = useState<DriverLocationSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

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
        const snap = await getDriverLocation(rideId);
        if (cancelled.current) return;
        console.log(
          `[DriverPoll] rideId=${rideId} status=${snap.status} lat=${snap.driverLat} lng=${snap.driverLng}`
        );
        setData(snap);
        setError(null);
        setLastFetchedAt(new Date());
        setStatus("polling");
      } catch (err: any) {
        if (cancelled.current) return;
        const msg =
          err?.response?.data?.message ??
          err?.message ??
          "Could not fetch driver location";
        console.warn("[DriverPoll] fetch failed:", msg);
        setError(typeof msg === "string" ? msg : "Poll failed");
      } finally {
        inFlight.current = false;
      }
    };

    setStatus("loading");
    void tick();
    timer = setInterval(tick, intervalMs);

    return () => {
      cancelled.current = true;
      if (timer) clearInterval(timer);
    };
  }, [rideId, active, intervalMs]);

  return { status, data, error, lastFetchedAt };
}
