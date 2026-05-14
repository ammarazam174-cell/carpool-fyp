// All times in this project represent Pakistan Standard Time (UTC+5).
// The backend tags every outgoing DateTime with an explicit "+05:00" offset,
// so `new Date(iso)` always produces the correct absolute moment without the
// device timezone shifting it. If a naked ISO ever shows up (no offset, no Z),
// treat it as PKT — never as UTC or device-local.

const PKT_OFFSET = "+05:00";

export function parseBackendDate(iso: string | Date): Date {
  if (iso instanceof Date) return iso;
  if (!iso) return new Date(NaN);
  if (/[zZ]|[+\-]\d{2}:?\d{2}$/.test(iso)) return new Date(iso);
  return new Date(iso + PKT_OFFSET);
}

export function fmtRideDateTime(iso: string | Date): { date: string; time: string } {
  const d = parseBackendDate(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  const date = d.toLocaleDateString("en-PK", {
    timeZone: "Asia/Karachi",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}

export function hasDeparted(iso: string | Date): boolean {
  const d = parseBackendDate(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() <= Date.now();
}

// Format a Date as a naked ISO ("YYYY-MM-DDTHH:mm:ss") using its local-clock
// components. Pair with the backend converter that treats naked ISO as PKT,
// so the user's chosen wall-clock survives regardless of device timezone.
// Assumes the device is on PKT (the app is Pakistan-only).
export function toNakedPktIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" + pad(d.getMonth() + 1) +
    "-" + pad(d.getDate()) +
    "T" + pad(d.getHours()) +
    ":" + pad(d.getMinutes()) +
    ":" + pad(d.getSeconds())
  );
}

export function formatPKT(date: string | Date): string {
  const d = parseBackendDate(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
