import { useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

// Earliest allowed DOB: 18 years ago from today
const maxDobDate = new Date();
maxDobDate.setFullYear(maxDobDate.getFullYear() - 18);
const MAX_DOB = maxDobDate.toISOString().split("T")[0];

// Latest allowed DOB: 80 years ago
const minDobDate = new Date();
minDobDate.setFullYear(minDobDate.getFullYear() - 80);
const MIN_DOB = minDobDate.toISOString().split("T")[0];

function calcAgeFromDob(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ── Validation ────────────────────────────────────────────────────────────────
const validators = {
  fullName: (v: string) => v.trim() ? "" : "Full name is required",
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Enter a valid email address",
  phoneNumber: (v: string) => /^03\d{9}$/.test(v) ? "" : "Format: 03XXXXXXXXX (11 digits)",
  cnic: (v: string) => v.replace(/\D/g, "").length === 13 ? "" : "CNIC must be exactly 13 digits",
  password: (v: string) => v.length >= 6 ? "" : "Password must be at least 6 characters",
  dateOfBirth: (v: string) => {
    if (!v) return "Date of birth is required";
    return calcAgeFromDob(v) >= 18 ? "" : "You must be at least 18 years old to register";
  },
  gender: (v: string) => v ? "" : "Gender is required",
};

const formatCnic = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function Signup() {
  const navigate = useNavigate();

  const [fields, setFields] = useState({
    fullName: "Mian", email: "jani@gmail.com", phoneNumber: "03123456789", cnic: "1234567890123",
    password: "password", role: "Driver", dateOfBirth: "2000-01-01", gender: "Ma le",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  // ── Handlers ────────────────────────────────────────────────────────────────
  const change = (field: keyof typeof fields, value: string) => {
    setFields((p) => ({ ...p, [field]: value }));
    const fn = validators[field as keyof typeof validators] as ((v: string) => string) | undefined;
    if (fn) setErrors((p) => ({ ...p, [field]: fn(value) }));
    setServerError("");
  };

  const handleSignup = async () => {
    const errs = {
      fullName: validators.fullName(fields.fullName),
      email: validators.email(fields.email),
      phoneNumber: validators.phoneNumber(fields.phoneNumber),
      cnic: validators.cnic(fields.cnic),
      password: validators.password(fields.password),
      dateOfBirth: validators.dateOfBirth(fields.dateOfBirth),
      gender: validators.gender(fields.gender),
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setLoading(true);
    setServerError("");
    try {
      await api.post("http://0.0.0.0:5000/api/auth/register", {
        fullName: fields.fullName,
        email: fields.email,
        phoneNumber: fields.phoneNumber,
        cnic: fields.cnic,
        password: fields.password,
        role: fields.role,
        dateOfBirth: fields.dateOfBirth,
        gender: fields.gender,
      });
      navigate("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: string } })?.response?.data;
      setServerError(typeof msg === "string" ? msg : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const agePreview = fields.dateOfBirth && !validators.dateOfBirth(fields.dateOfBirth)
    ? calcAgeFromDob(fields.dateOfBirth)
    : null;

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-10">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3 shadow-xl shadow-blue-900/50">
            <span className="text-2xl">🚗</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Saffar</h1>
          <p className="text-blue-300 mt-1 text-sm font-medium">Pakistan's trusted carpooling platform</p>
        </div>

        {/* Trust badges */}
        <div className="flex justify-center gap-4 mb-6 flex-wrap">
          {[["🔒", "Your data is secure"], ["✓", "Only verified drivers allowed"], ["🛡", "Safe rides"]].map(
            ([icon, label]) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-xs bg-white/10 text-blue-200 px-3 py-1.5 rounded-full border border-white/10">
                <span>{icon}</span> {label}
              </span>
            )
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Create Account 🚀</h2>
          <p className="text-gray-500 text-sm mb-6">Join thousands of commuters across Pakistan</p>

          {/* Server error */}
          {serverError && (
            <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              <span className="mt-0.5">⚠</span> <span>{serverError}</span>
            </div>
          )}

          <div className="space-y-4">

            {/* Full Name */}
            <Field label="Full Name" required error={errors.fullName}>
              <InputIcon icon="👤">
                <input
                  type="text"
                  placeholder="e.g. Ali Khan"
                  autoComplete="name"
                  value={fields.fullName}
                  onChange={(e) => change("fullName", e.target.value)}
                  className={inp(errors.fullName)}
                />
              </InputIcon>
            </Field>

            {/* Email */}
            <Field label="Email Address" required error={errors.email}>
              <InputIcon icon="✉">
                <input
                  type="email"
                  placeholder="ali@example.com"
                  autoComplete="username"
                  value={fields.email}
                  onChange={(e) => change("email", e.target.value)}
                  className={inp(errors.email)}
                />
              </InputIcon>
            </Field>

            {/* Phone */}
            <Field label="Phone Number" required error={errors.phoneNumber}>
              <InputIcon icon="📱">
                <input
                  type="text"
                  placeholder="03XXXXXXXXX"
                  autoComplete="off"
                  value={fields.phoneNumber}
                  maxLength={11}
                  onChange={(e) => change("phoneNumber", e.target.value.replace(/\D/g, ""))}
                  className={inp(errors.phoneNumber)}
                />
              </InputIcon>
              <p className="mt-1 text-xs text-blue-500 flex items-center gap-1">
                <span>📲</span> OTP will be sent to this number for verification
              </p>
            </Field>

            {/* CNIC */}
            <Field label="CNIC Number" required error={errors.cnic}>
              <InputIcon icon="🪪">
                <input
                  type="text"
                  placeholder="42501-7669968-9"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={fields.cnic}
                  maxLength={15}
                  onChange={(e) => change("cnic", formatCnic(e.target.value))}
                  className={`${inp(errors.cnic)} font-mono tracking-wide`}
                />
              </InputIcon>
              <p className="mt-1 text-xs text-gray-400">Format: XXXXX-XXXXXXX-X (13 digits, auto-formatted)</p>
            </Field>

            {/* Date of Birth */}
            <Field label="Date of Birth" required error={errors.dateOfBirth}>
              <InputIcon icon="🎂">
                <input
                  type="date"
                  value={fields.dateOfBirth}
                  min={MIN_DOB}
                  max={MAX_DOB}
                  onChange={(e) => change("dateOfBirth", e.target.value)}
                  className={inp(errors.dateOfBirth)}
                />
              </InputIcon>
              {agePreview !== null && (
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  <span>✓</span> Age: {agePreview} years
                </p>
              )}
              {!fields.dateOfBirth && (
                <p className="mt-1 text-xs text-gray-400">Must be at least 18 years old</p>
              )}
            </Field>

            {/* Gender */}
            <Field label="Gender" required error={errors.gender}>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none pointer-events-none">⚧</span>
                <select
                  value={fields.gender}
                  onChange={(e) => change("gender", e.target.value)}
                  className={`${inp(errors.gender)} pl-9 appearance-none`}
                >
                  <option value="">Select gender…</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </Field>

            {/* Password */}
            <Field label="Password" required error={errors.password}>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none pointer-events-none">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  value={fields.password}
                  onChange={(e) => change("password", e.target.value)}
                  className={`${inp(errors.password)} pl-9 pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>

            {/* Role */}
            <Field label="Register as" error="">
              <div className="grid grid-cols-2 gap-3">
                {["Driver", "Passenger"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFields((p) => ({ ...p, role: r }))}
                    className={[
                      "py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                      fields.role === r
                        ? "border-blue-600 bg-blue-600 text-white shadow-md"
                        : "border-gray-200 bg-white text-gray-600 hover:border-blue-300",
                    ].join(" ")}
                  >
                    {r === "Driver" ? "🚗 Driver" : "🧳 Passenger"}
                  </button>
                ))}
              </div>
            </Field>

            {/* Submit */}
            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[.98] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><Spinner /> Creating account…</>
              ) : (
                "Create Account →"
              )}
            </button>

          </div>

          <p className="text-center mt-5 text-sm text-gray-500">
            Already have an account?{" "}
            <span
              onClick={() => navigate("/")}
              className="text-blue-600 font-semibold cursor-pointer hover:underline"
            >
              Login
            </span>
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InputIcon({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none pointer-events-none">
        {icon}
      </span>
      {children}
    </div>
  );
}

function Field({
  label, required, error, children,
}: {
  label: string; required?: boolean; error: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

function inp(error: string) {
  return [
    "w-full border rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 transition bg-gray-50 hover:bg-white",
    error
      ? "border-red-400 focus:ring-red-300 bg-red-50"
      : "border-gray-200 focus:ring-blue-400 focus:border-transparent",
  ].join(" ");
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}
