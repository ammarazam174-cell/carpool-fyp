// All times in this project represent Pakistan Standard Time (UTC+5).
// The backend tags every outgoing DateTime with an explicit "+05:00" offset,
// so `new Date(iso)` produces the correct absolute moment without the
// browser timezone shifting it. If a naked ISO ever arrives (no offset, no Z),
// treat it as PKT — never as UTC or browser-local.

const PKT_OFFSET = "+05:00";

export function parseBackendDate(iso: string | Date): Date {
  if (iso instanceof Date) return iso;
  if (!iso) return new Date(NaN);
  if (/[zZ]|[+\-]\d{2}:?\d{2}$/.test(iso)) return new Date(iso);
  return new Date(iso + PKT_OFFSET);
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

export function formatPKTDate(date: string | Date): string {
  const d = parseBackendDate(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatPKTTime(date: string | Date): string {
  const d = parseBackendDate(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
  });
}
