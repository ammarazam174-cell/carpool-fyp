import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────

type ProfileInfo = {
  fullName: string;
  role: string;
  isProfileComplete: boolean;
  isVerified: boolean;
  status: string;
};

type FileSlot = {
  file: File | null;
  preview: string | null;
  dragging: boolean;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function UploadCard({
  label,
  required,
  icon,
  slot,
  error,
  disabled,
  onFile,
  onClear,
}: {
  label: string;
  required?: boolean;
  icon: string;
  slot: FileSlot;
  error?: string;
  disabled: boolean;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const borderColor = error
    ? "border-red-400 bg-red-50"
    : slot.file
    ? "border-green-400 bg-green-50"
    : slot.dragging
    ? "border-blue-500 bg-blue-50 scale-[1.01]"
    : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50";

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl px-4 py-6 cursor-pointer transition-all select-none ${
          disabled ? "opacity-60 cursor-not-allowed bg-gray-100 border-gray-200" : borderColor
        }`}
      >
        {slot.preview ? (
          <img src={slot.preview} alt="Preview" className="w-28 h-28 object-cover rounded-xl mb-3 shadow-md" />
        ) : (
          <span className="text-4xl mb-3">{slot.file ? "✅" : icon}</span>
        )}

        <p className={`text-sm font-medium text-center ${slot.file ? "text-green-700" : "text-gray-500"}`}>
          {slot.file ? slot.file.name : "Drag & drop or click to upload"}
        </p>

        {!slot.file && (
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF · Max 3 MB</p>
        )}

        {slot.file && !disabled && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="mt-2 text-xs text-red-500 hover:underline"
          >
            Remove
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="hidden"
          disabled={disabled}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const emptySlot = (): FileSlot => ({ file: null, preview: null, dragging: false });

export default function CompleteProfile() {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [info, setInfo]         = useState<ProfileInfo | null>(null);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [errors, setErrors]     = useState<Record<string, string>>({});

  const [profileSlot, setProfileSlot] = useState<FileSlot>(emptySlot());
  const [cnicSlot,    setCnicSlot]    = useState<FileSlot>(emptySlot());
  const [licenseSlot, setLicenseSlot] = useState<FileSlot>(emptySlot());

  // ── Load profile info ──────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/profile/me")
      .then((res) => {
        setInfo(res.data);
        // Already submitted → show status page
      })
      .catch(() => navigate("/"))
      .finally(() => setLoading(false));
  }, []);

  const setFile = (
    setter: React.Dispatch<React.SetStateAction<FileSlot>>,
    field: string,
    file: File
  ) => {
    setter((prev) => {
      const preview = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null;
      return { ...prev, file, preview };
    });
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  const clearSlot = (setter: React.Dispatch<React.SetStateAction<FileSlot>>) => {
    setter(emptySlot());
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!info) return;
    const errs: Record<string, string> = {};
    if (!profileSlot.file) errs.profile = "Profile image is required";
    if (!cnicSlot.file)    errs.cnic    = "CNIC image is required";
    if (info.role === "Driver" && !licenseSlot.file)
      errs.license = "Driving license is required";

    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    const formData = new FormData();
    formData.append("profileImage", profileSlot.file!);
    formData.append("cnicImage",    cnicSlot.file!);
    if (licenseSlot.file) formData.append("licenseImage", licenseSlot.file);

    setSubmitting(true);
    setServerError("");
    try {
      await api.post("/profile/upload-documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Refresh info to show "pending" state
      const res = await api.get("/profile/me");
      setInfo(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data ?? "Upload failed.";
      setServerError(typeof msg === "string" ? msg : "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  const role = info?.role ?? user?.role ?? "Driver";
  const isDriver = role === "Driver";

  // ── Already submitted — show status screen ────────────────────────────────
  if (info?.isProfileComplete) {
    const status = info.status;

    const statusConfig = {
      Approved: {
        icon: "✅",
        title: "Profile Approved!",
        sub: "You are verified and can now use all features.",
        bg: "bg-green-50 border-green-200",
        badge: "bg-green-100 text-green-700",
        btnLabel: `Go to ${role} Dashboard`,
        btnFn: () => navigate(isDriver ? "/driver" : "/passenger"),
      },
      Rejected: {
        icon: "❌",
        title: "Profile Rejected",
        sub: "Your documents were rejected by admin. Please contact support.",
        bg: "bg-red-50 border-red-200",
        badge: "bg-red-100 text-red-700",
        btnLabel: "Back to Login",
        btnFn: () => navigate("/"),
      },
      Pending: {
        icon: "🕐",
        title: "Under Review",
        sub: "Your documents have been submitted and are being reviewed by admin.",
        bg: "bg-amber-50 border-amber-200",
        badge: "bg-amber-100 text-amber-700",
        btnLabel: `Go to ${role} Dashboard`,
        btnFn: () => navigate(isDriver ? "/driver" : "/passenger"),
      },
    };

    const cfg = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.Pending;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-xl">
              <span className="text-3xl">🚗</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white">Saffar</h1>
          </div>

          <div className={`bg-white rounded-2xl shadow-2xl p-8 border ${cfg.bg}`}>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">{cfg.icon}</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{cfg.title}</h2>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${cfg.badge}`}>
                {status}
              </span>
              <p className="text-gray-500 text-sm mt-3">{cfg.sub}</p>
            </div>

            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5 text-sm text-gray-600">
              <p><span className="font-semibold">Name:</span> {info.fullName}</p>
              <p><span className="font-semibold">Role:</span> {role}</p>
            </div>

            <button
              onClick={cfg.btnFn}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
            >
              {cfg.btnLabel} →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Upload form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-10">
      <div className="w-full max-w-lg">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-xl">
            <span className="text-3xl">🚗</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Saffar</h1>
          <p className="text-blue-300 mt-1.5 text-sm font-medium">Complete your profile to get started</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
              {(info?.fullName ?? "U")[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{info?.fullName}</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isDriver ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
              }`}>
                {role}
              </span>
            </div>
          </div>

          <p className="text-gray-500 text-sm mb-6">
            Upload your verification documents below. <strong>These can only be submitted once.</strong>
          </p>

          {/* Step info */}
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-sm text-blue-700">
            <span>ℹ</span>
            <span>After submission, admin will review and approve your account (usually within 24h).</span>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              <span>⚠</span> <span>{serverError}</span>
            </div>
          )}

          <div className="space-y-5">

            {/* Profile Image */}
            <UploadCard
              label="Profile Photo"
              required
              icon="🤳"
              slot={profileSlot}
              error={errors.profile}
              disabled={submitting}
              onFile={(f) => setFile(setProfileSlot, "profile", f)}
              onClear={() => clearSlot(setProfileSlot)}
            />

            {/* CNIC Image */}
            <UploadCard
              label="CNIC / National ID Image"
              required
              icon="🪪"
              slot={cnicSlot}
              error={errors.cnic}
              disabled={submitting}
              onFile={(f) => setFile(setCnicSlot, "cnic", f)}
              onClear={() => clearSlot(setCnicSlot)}
            />

            {/* Driving License (Driver only) */}
            {isDriver && (
              <UploadCard
                label="Driving License"
                required
                icon="📋"
                slot={licenseSlot}
                error={errors.license}
                disabled={submitting}
                onFile={(f) => setFile(setLicenseSlot, "license", f)}
                onClear={() => clearSlot(setLicenseSlot)}
              />
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-[.98] mt-2"
            >
              {submitting ? (
                <>
                  <Spinner /> Uploading…
                </>
              ) : (
                "Submit Documents →"
              )}
            </button>

          </div>
        </div>

        {/* Trust row */}
        <div className="flex justify-center gap-6 mt-6">
          {[["🔒", "Secure Upload"], ["✓", "One-time Submission"], ["🛡", "Data Protected"]].map(
            ([icon, label]) => (
              <span key={label} className="text-xs text-blue-300 flex items-center gap-1">
                <span>{icon}</span> {label}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
