/**
 * set-ip.js — auto-sets EXPO_PUBLIC_API_URL in .env to the host machine's
 * current LAN IPv4 address. Runs as a `prestart` hook so `npm start`
 * always picks up the current network without manual edits.
 *
 * Uses Node's built-in `os.networkInterfaces()` — no extra dependency needed.
 * (The `ip` npm package is a thin wrapper around exactly this API.)
 *
 * Environment overrides (useful for CI or tunneled runs):
 *   API_HOST_OVERRIDE=1.2.3.4   → skip detection, use this host
 *   API_PORT=5000               → change port (default 5000)
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const DEFAULT_PORT = Number(process.env.API_PORT ?? 5000);
const ENV_PATH = path.resolve(__dirname, ".env");
const ENV_KEY = "EXPO_PUBLIC_API_URL";

// Adapters we never want to pick — virtual switches from Docker / WSL / VMware
// / VirtualBox / Hyper-V / Parallels show up as valid IPv4 "private" networks
// but a phone on your real WiFi can't reach them.
const VIRTUAL_NAME_PATTERNS = [
  /vEthernet/i,
  /VMware/i,
  /VirtualBox/i,
  /Hyper-?V/i,
  /WSL/i,
  /docker/i,
  /vmnet/i,
  /vnic/i,
  /tun\d/i,
  /utun\d/i,
  /tap\d/i,
  /zt/i,            // ZeroTier
  /tailscale/i,
];

function isVirtualInterface(name) {
  return VIRTUAL_NAME_PATTERNS.some((re) => re.test(name));
}

// Score each candidate so the "most likely real WiFi/ethernet" wins. Higher
// scores beat lower scores; ties fall back to the OS iteration order.
function score(name, addr) {
  let s = 0;
  // Wireless interfaces are the 99% case for hot-reload over LAN.
  if (/wi-?fi|wlan|wireless/i.test(name)) s += 40;
  else if (/ethernet|eth\d|en\d|enp\d/i.test(name)) s += 30;
  // Prefer 192.168.x — the most common home WiFi range.
  if (/^192\.168\./.test(addr)) s += 10;
  else if (/^10\./.test(addr)) s += 5;
  else if (/^172\.(1[6-9]|2\d|3[01])\./.test(addr)) s += 5;
  return s;
}

function detectLanIp() {
  if (process.env.API_HOST_OVERRIDE) {
    return { ip: process.env.API_HOST_OVERRIDE, source: "override" };
  }

  const ifaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, entries] of Object.entries(ifaces)) {
    if (!entries) continue;
    if (isVirtualInterface(name)) continue;
    for (const entry of entries) {
      if (entry.family !== "IPv4" && entry.family !== 4) continue;
      if (entry.internal) continue;
      candidates.push({ name, addr: entry.address, score: score(name, entry.address) });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.score - a.score);
  const winner = candidates[0];
  return { ip: winner.addr, source: winner.name, candidates };
}

function buildEnvContent(existing, key, value) {
  const lines = existing.split(/\r?\n/);
  const line = `${key}=${value}`;
  let replaced = false;
  const next = lines.map((l) => {
    // Preserve comments and unrelated keys untouched.
    if (l.trim().startsWith("#")) return l;
    const match = l.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (match && match[1] === key) {
      replaced = true;
      return line;
    }
    return l;
  });
  if (!replaced) {
    // Drop trailing blank line if any, then append + trailing newline.
    while (next.length && next[next.length - 1].trim() === "") next.pop();
    next.push(line);
  }
  // Always end with a single trailing newline.
  return next.join("\n").replace(/\n*$/, "\n");
}

function main() {
  const detected = detectLanIp();
  if (!detected) {
    console.error(
      "[set-ip] ✖ Could not detect a usable LAN IPv4 address. " +
        "Check your network connection, or set API_HOST_OVERRIDE=<ip> manually."
    );
    process.exit(1);
  }

  const url = `http://${detected.ip}:${DEFAULT_PORT}`;

  const existing = fs.existsSync(ENV_PATH)
    ? fs.readFileSync(ENV_PATH, "utf8")
    : "";
  const next = buildEnvContent(existing, ENV_KEY, url);

  if (existing === next) {
    console.log(`[set-ip] ✓ ${ENV_KEY} already set to ${url} — no change`);
  } else {
    fs.writeFileSync(ENV_PATH, next, "utf8");
    console.log(`[set-ip] ✓ Wrote ${ENV_KEY}=${url}`);
  }

  console.log(`[set-ip]   interface: ${detected.source}`);
  if (detected.candidates && detected.candidates.length > 1) {
    const others = detected.candidates
      .slice(1)
      .map((c) => `${c.name}@${c.addr}`)
      .join(", ");
    console.log(`[set-ip]   other candidates: ${others}`);
  }
}

main();
