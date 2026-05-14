import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { topUpWallet } from "../../api/wallet";

type Props = {
  backTo: string;
  walletPath: string;
};

const QUICK_AMOUNTS = [200, 500, 1000, 2000, 5000];
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 1_000_000;

type Phase =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "success"; amount: number; newBalance: number; referenceId: string }
  | { kind: "failure"; amount: number; reason: string };

function newIdempotencyKey(): string {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

function fmt(amount: number) {
  return amount.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TopUp({ backTo, walletPath }: Props) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "form" });

  const idemKey = useRef(newIdempotencyKey());
  const inFlight = useRef(false);

  const numeric = Number(amount);
  const valid = useMemo(
    () =>
      Number.isFinite(numeric) &&
      numeric >= MIN_AMOUNT &&
      numeric <= MAX_AMOUNT,
    [numeric]
  );

  // Live validation as the user types.
  useEffect(() => {
    if (amount === "") {
      setErrorMsg(null);
      return;
    }
    if (!Number.isFinite(numeric)) {
      setErrorMsg("Enter a valid number.");
      return;
    }
    if (numeric < MIN_AMOUNT) {
      setErrorMsg(`Minimum top-up is Rs. ${MIN_AMOUNT}.`);
      return;
    }
    if (numeric > MAX_AMOUNT) {
      setErrorMsg(`Maximum top-up is Rs. ${MAX_AMOUNT.toLocaleString()}.`);
      return;
    }
    setErrorMsg(null);
  }, [amount, numeric]);

  const submit = async () => {
    if (amount === "") {
      setErrorMsg("Please enter an amount.");
      return;
    }
    if (!valid) return;
    if (inFlight.current) return;
    inFlight.current = true;
    setPhase({ kind: "submitting" });

    try {
      const res = await topUpWallet(numeric, idemKey.current);
      if (res.status !== "Success") {
        setPhase({
          kind: "failure",
          amount: numeric,
          reason: res.message || "Payment was not completed.",
        });
        return;
      }
      setPhase({
        kind: "success",
        amount: numeric,
        newBalance: res.newBalance,
        referenceId: res.referenceId,
      });
    } catch (err: any) {
      const reason =
        err?.response?.data?.message ??
        err?.message ??
        "We couldn't reach the payment service. Check your connection and try again.";
      setPhase({ kind: "failure", amount: numeric, reason });
    } finally {
      inFlight.current = false;
    }
  };

  const retry = () => {
    idemKey.current = newIdempotencyKey();
    setPhase({ kind: "form" });
  };

  // ── Success ──────────────────────────────────────────────────────────────
  if (phase.kind === "success") {
    return (
      <div className="min-h-screen bg-bgSoft py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-green-50 border-2 border-green-300/50 flex items-center justify-center animate-[scale_400ms_ease-out]">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
              <svg
                className="w-9 h-9 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-textDark mt-5">
            Top-Up Successful
          </h2>
          <p className="text-textMuted mt-1">
            Rs. {fmt(phase.amount)} added to your wallet
          </p>

          <div className="mt-6 bg-bgSoft rounded-xl p-5 text-left">
            <Row label="Amount Added" value={`Rs. ${fmt(phase.amount)}`} />
            <hr className="my-2 border-gray-200" />
            <Row
              label="New Balance"
              value={`Rs. ${fmt(phase.newBalance)}`}
              bold
            />
            <hr className="my-2 border-gray-200" />
            <Row
              label="Reference"
              value={phase.referenceId}
              mono
            />
          </div>

          <button
            onClick={() => navigate(walletPath)}
            className="mt-6 w-full bg-primary text-white font-bold py-3 rounded-full hover:bg-primaryDark transition shadow-md"
          >
            Back to Wallet
          </button>
        </div>
      </div>
    );
  }

  // ── Failure ──────────────────────────────────────────────────────────────
  if (phase.kind === "failure") {
    return (
      <div className="min-h-screen bg-bgSoft py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-red-50 border-2 border-red-300/50 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
              <svg
                className="w-9 h-9 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-textDark mt-5">
            Top-Up Failed
          </h2>
          <p className="text-textMuted mt-1">
            Rs. {fmt(phase.amount)} was not charged
          </p>

          <div className="mt-5 bg-red-50 border border-red-200 rounded-xl p-4 text-left">
            <p className="text-sm text-red-700 leading-relaxed">
              <span className="font-semibold">Reason: </span>
              {phase.reason}
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={retry}
              className="w-full bg-primary text-white font-bold py-3 rounded-full hover:bg-primaryDark transition shadow-md"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate(walletPath)}
              className="w-full text-textMuted font-semibold py-2.5 rounded-full hover:text-textDark transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  const submitting = phase.kind === "submitting";
  return (
    <div className="min-h-screen bg-bgSoft py-6 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            to={backTo}
            className="text-textMuted hover:text-textDark text-sm font-medium"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-textDark">Top Up Wallet</h1>
          <div className="w-10" />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md">
          <p className="text-xs font-bold tracking-wider uppercase text-textMuted mb-2">
            Amount
          </p>
          <div
            className={`relative rounded-xl bg-inputBg border-2 transition ${
              errorMsg ? "border-red-400" : "border-gray-200 focus-within:border-primary"
            }`}
          >
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted font-bold text-lg">
              Rs.
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="0"
              maxLength={7}
              disabled={submitting}
              className="w-full pl-14 pr-4 py-4 text-3xl font-extrabold bg-transparent rounded-xl focus:outline-none disabled:opacity-50 tabular-nums"
            />
          </div>

          {/* Validation row — fixed-height to avoid layout jumps */}
          <div className="min-h-[20px] mt-2">
            {errorMsg ? (
              <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                <span>⚠</span>
                {errorMsg}
              </p>
            ) : (
              <p className="text-xs text-textMuted">
                Min Rs. {MIN_AMOUNT} · Max Rs. {MAX_AMOUNT.toLocaleString()}
              </p>
            )}
          </div>

          <p className="text-xs font-bold tracking-wider uppercase text-textMuted mt-4 mb-2">
            Quick Amounts
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((q) => {
              const active = numeric === q;
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  disabled={submitting}
                  className={`px-4 py-2 text-sm font-bold rounded-full border-2 transition active:scale-95 ${
                    active
                      ? "bg-primary text-white border-primary shadow"
                      : "bg-bgSoft text-textDark border-gray-200 hover:border-primary"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Rs. {q.toLocaleString()}
                </button>
              );
            })}
          </div>

          <button
            onClick={submit}
            disabled={!valid || submitting}
            className="mt-6 w-full bg-primary text-white font-extrabold tracking-wide py-3.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-primaryDark enabled:hover:shadow-lg transition shadow-md flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Processing payment…
              </>
            ) : (
              <>
                {valid
                  ? `Confirm Top-Up · Rs. ${fmt(numeric)}`
                  : "Confirm Top-Up"}
              </>
            )}
          </button>

          <p className="text-xs text-textMuted mt-3 text-center flex items-center justify-center gap-1">
            <span>🔒</span>
            Demo Mode — Payments are simulated for testing purposes
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-sm text-textMuted">{label}</span>
      <span
        className={`tabular-nums truncate ml-2 ${
          bold ? "text-lg font-extrabold text-primary" : "text-sm font-bold text-textDark"
        } ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
