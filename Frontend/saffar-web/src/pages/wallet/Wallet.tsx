import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getWalletBalance,
  listWalletTransactions,
} from "../../api/wallet";
import type {
  Transaction,
  TransactionStatus,
  TransactionType,
} from "../../types/wallet";

type Props = {
  /** Where the back button should go (`/passenger` or `/driver`). */
  backTo: string;
  /** Where the Top Up CTA should navigate. */
  topUpTo: string;
};

type Filter = "All" | "TopUp" | "Ride" | "Refund";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "All",    label: "All"     },
  { key: "TopUp",  label: "Top-Ups" },
  { key: "Ride",   label: "Rides"   },
  { key: "Refund", label: "Refunds" },
];

const STATUS_PILL: Record<
  TransactionStatus,
  { bg: string; text: string; dot: string }
> = {
  Success: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  Pending: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  Failed:  { bg: "bg-red-100",   text: "text-red-700",   dot: "bg-red-500"   },
};

const TYPE_LABEL: Record<TransactionType, string> = {
  TopUp:         "Wallet Top-Up",
  RidePayment:   "Ride Payment",
  DriverEarning: "Ride Earning",
  Refund:        "Refund",
};

const TYPE_ICON: Record<TransactionType, string> = {
  TopUp:         "↓",
  RidePayment:   "↑",
  DriverEarning: "↓",
  Refund:        "↺",
};

function matchesFilter(t: Transaction, f: Filter): boolean {
  if (f === "All") return true;
  if (f === "TopUp")  return t.type === "TopUp";
  if (f === "Refund") return t.type === "Refund";
  if (f === "Ride")
    return t.type === "RidePayment" || t.type === "DriverEarning";
  return true;
}

function formatPkr(amount: number) {
  const sign = amount < 0 ? "-" : "+";
  const abs = Math.abs(amount);
  return `${sign} Rs. ${abs.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Skeleton loader for activity list rows.
function SkeletonRow() {
  return (
    <li className="px-4 py-3 flex items-start gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-2 bg-gray-100 rounded w-1/3" />
      </div>
      <div className="w-16 h-3 bg-gray-200 rounded" />
    </li>
  );
}

export default function Wallet({ backTo, topUpTo }: Props) {
  const [balance, setBalance] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("All");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bal, list] = await Promise.all([
        getWalletBalance(),
        listWalletTransactions(80),
      ]);
      setBalance(bal.balance);
      setUpdatedAt(bal.updatedAt);
      setTxns(list);
    } catch {
      toast.error("Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => txns.filter((t) => matchesFilter(t, filter)),
    [txns, filter]
  );

  return (
    <div className="min-h-screen bg-bgSoft py-6 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to={backTo}
            className="text-textMuted hover:text-textDark text-sm font-medium"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-textDark">My Wallet</h1>
          <div className="w-10" />
        </div>

        {/* Balance card with gradient + shadow */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primaryMid to-secondary rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wider uppercase opacity-80">
              Available Balance
            </p>
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-xl">
              💳
            </div>
          </div>

          <div className="flex items-baseline mt-3">
            <span className="text-base font-bold opacity-80 mr-1.5">Rs.</span>
            <span className="text-4xl font-extrabold tabular-nums tracking-tight">
              {balance == null
                ? "—"
                : balance.toLocaleString("en-PK", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
            </span>
          </div>

          {updatedAt && (
            <p className="text-[11px] opacity-70 mt-1">
              Updated{" "}
              {new Date(updatedAt).toLocaleString("en-PK", {
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}

          <Link
            to={topUpTo}
            className="inline-flex items-center gap-1 mt-5 bg-accent text-textDark font-bold px-5 py-2.5 rounded-full hover:bg-accentDark transition shadow-md"
          >
            <span className="text-lg leading-none">+</span>
            Top Up Wallet
          </Link>
        </div>

        {/* Activity */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-textDark">Activity</h2>
            <button
              onClick={load}
              disabled={loading}
              className="text-sm text-primary hover:underline disabled:opacity-40"
            >
              Refresh
            </button>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide transition border ${
                    active
                      ? "bg-primary text-white border-primary shadow"
                      : "bg-white text-textDark border-gray-200 hover:border-primary"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <ul className="bg-white rounded-xl divide-y divide-gray-100 overflow-hidden">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </ul>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl py-10 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-bgSoft border border-gray-200 flex items-center justify-center text-3xl">
                🧾
              </div>
              <p className="mt-3 font-semibold text-textDark">
                {filter === "All"
                  ? "No transactions yet"
                  : "No matching transactions"}
              </p>
              <p className="mt-1 text-sm text-textMuted px-8">
                {filter === "All"
                  ? "Top up your wallet to start booking rides — your activity will appear here."
                  : "Try a different filter to see more activity."}
              </p>
            </div>
          ) : (
            <ul className="bg-white rounded-xl divide-y divide-gray-100 overflow-hidden shadow-sm">
              {filtered.map((t) => {
                const isCredit = t.amount > 0;
                const pill = STATUS_PILL[t.status];
                return (
                  <li
                    key={t.id}
                    className="px-4 py-3 flex items-start gap-3 hover:bg-bgSoft/60 transition"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        isCredit
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {TYPE_ICON[t.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-textDark truncate">
                          {TYPE_LABEL[t.type] ?? t.type}
                        </p>
                        <p
                          className={`font-bold tabular-nums ${
                            isCredit ? "text-green-700" : "text-red-700"
                          }`}
                        >
                          {formatPkr(t.amount)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-textMuted">
                          {formatDate(t.createdAt)}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${pill.bg} ${pill.text}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${pill.dot}`}
                          />
                          {t.status}
                        </span>
                      </div>
                      {t.referenceId && (
                        <p className="text-[11px] text-textMuted mt-0.5 font-mono truncate">
                          Ref: {t.referenceId}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
