import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

const BASE = "http://localhost:5000";

type Profile = {
  fullName: string;
  email: string;
  phoneNumber: string;
  cnic: string | null;
  dateOfBirth: string | null;
  age: number | null;
  gender: string | null;
  profileImageUrl: string | null;
  cnicImageUrl: string | null;
  isProfileComplete: boolean;
  isVerified: boolean;
  status: string;
};

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatDob(dob: string | null): string {
  if (!dob) return "Not set";
  return new Date(dob).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_CFG = {
  Approved: { label: "Approved",      icon: "✓",  cls: "bg-green-500/15 text-green-400 border-green-500/30" },
  Pending:  { label: "Under Review",  icon: "🕐", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  Rejected: { label: "Rejected",      icon: "✕",  cls: "bg-red-500/15 text-red-400 border-red-500/30"       },
};

export default function PassengerViewProfile() {
  const navigate = useNavigate();

  const [profile, setProfile]     = useState<Profile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [editMode, setEditMode]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");

  const [fullName, setFullName]       = useState("");
  const [email, setEmail]             = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender]           = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const maxDob = (() => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().split("T")[0];
  })();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await api.get("/profile/me");
      const d   = res.data;
      setProfile(d);
      setFullName(d.fullName ?? "");
      setEmail(d.email ?? "");
      setPhoneNumber(d.phoneNumber ?? "");
      setGender(d.gender ?? "");
      setDateOfBirth(d.dateOfBirth ? d.dateOfBirth.split("T")[0] : "");
    } catch {
      alert("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const enterEdit = () => { setSaveError(""); setEditMode(true); };

  const cancelEdit = () => {
    if (profile) {
      setFullName(profile.fullName ?? "");
      setEmail(profile.email ?? "");
      setPhoneNumber(profile.phoneNumber ?? "");
      setGender(profile.gender ?? "");
      setDateOfBirth(profile.dateOfBirth ? profile.dateOfBirth.split("T")[0] : "");
    }
    setSaveError("");
    setEditMode(false);
  };

  const save = async () => {
    if (!fullName.trim()) { setSaveError("Full name is required"); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setSaveError("Enter a valid email address"); return; }
    if (phoneNumber && !/^03\d{9}$/.test(phoneNumber)) { setSaveError("Phone must be 03XXXXXXXXX (11 digits)"); return; }

    try {
      setSaving(true);
      setSaveError("");
      const form = new FormData();
      form.append("FullName", fullName.trim());
      if (email)       form.append("Email",       email.trim());
      if (phoneNumber) form.append("PhoneNumber", phoneNumber.trim());
      if (gender)      form.append("Gender",      gender);
      if (dateOfBirth) form.append("DateOfBirth", dateOfBirth);

      await api.put("/profile/update", form);

      setProfile(prev => prev ? {
        ...prev,
        fullName,
        email:       email       || prev.email,
        phoneNumber: phoneNumber || prev.phoneNumber,
        gender:      gender      || null,
        dateOfBirth: dateOfBirth ? `${dateOfBirth}T00:00:00` : prev.dateOfBirth,
        age:         dateOfBirth ? calcAge(dateOfBirth) : prev.age,
      } : prev);
      setEditMode(false);
    } catch {
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
        <svg className="animate-spin h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  if (!profile) return null;

  const status = profile.status ?? "Pending";
  const badge  = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.Pending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 px-4 py-10">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Back */}
        <button
          onClick={() => navigate("/passenger")}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium transition-colors mb-2"
        >
          ← Back to Dashboard
        </button>

        {/* ── Header card ── */}
        <div className="bg-gray-800/60 backdrop-blur border border-gray-700/60 rounded-2xl p-6 text-center shadow-xl">
          {profile.profileImageUrl ? (
            <img
              src={`${BASE}${profile.profileImageUrl}`}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-blue-500 mx-auto mb-3 shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-3xl font-bold text-white mx-auto mb-3 shadow-lg">
              {(profile.fullName ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
          <h2 className="text-2xl font-bold text-white">{profile.fullName || "—"}</h2>
          <p className="text-gray-500 text-sm mt-0.5 mb-3">Passenger</p>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.cls}`}>
            <span>{badge.icon}</span> {badge.label}
          </span>
        </div>

        {/* ── Verification alert ── */}
        {!profile.isVerified && (
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
            status === "Rejected"
              ? "bg-red-950/50 border-red-800/60 text-red-300"
              : "bg-amber-950/50 border-amber-800/60 text-amber-300"
          }`}>
            <span className="text-base mt-0.5 shrink-0">{status === "Rejected" ? "❌" : "🕐"}</span>
            <div>
              <p className="font-semibold">
                {status === "Rejected" ? "Profile Rejected" : "Profile Under Review"}
              </p>
              <p className="text-xs mt-0.5 opacity-80">
                {status === "Rejected"
                  ? "Your documents were rejected. Please contact support."
                  : "Your profile is under review by admin. Some features are restricted until approved."}
              </p>
            </div>
          </div>
        )}

        {/* ── Personal Info card ── */}
        <div className="bg-gray-800/60 backdrop-blur border border-gray-700/60 rounded-2xl overflow-hidden shadow-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
            <h3 className="text-white font-semibold text-sm">Personal Information</h3>
            {!editMode ? (
              <button
                onClick={enterEdit}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-all"
              >
                ✏ Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-xs font-semibold text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {saveError && (
            <div className="mx-5 mt-3 text-xs text-red-400 bg-red-900/30 border border-red-800/50 px-3 py-2 rounded-lg">
              ⚠ {saveError}
            </div>
          )}

          <div className="divide-y divide-gray-700/40">

            {/* Full Name */}
            <EditableRow
              icon="👤" label="Full Name"
              value={profile.fullName ?? ""}
              editValue={fullName}
              editMode={editMode}
              onChange={setFullName}
              placeholder="Your full name"
            />

            {/* Email */}
            <EditableRow
              icon="✉" label="Email Address"
              value={profile.email}
              editValue={email}
              editMode={editMode}
              onChange={setEmail}
              type="email"
              placeholder="email@example.com"
            />

            {/* Phone */}
            <EditableRow
              icon="📞" label="Phone Number"
              value={profile.phoneNumber}
              editValue={phoneNumber}
              editMode={editMode}
              onChange={setPhoneNumber}
              placeholder="03XXXXXXXXX"
            />

            {/* CNIC — read-only */}
            <ReadOnlyRow icon="🪪" label="CNIC Number" value={profile.cnic ?? "—"} mono />

            {/* Date of Birth */}
            <div className="flex items-start gap-3 px-5 py-4">
              <span className="text-lg w-7 shrink-0 text-center mt-0.5">🎂</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">Date of Birth</p>
                {editMode ? (
                  <input
                    type="date"
                    value={dateOfBirth}
                    max={maxDob}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="bg-gray-700 border border-blue-500 text-white rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                ) : (
                  <p className="text-white font-medium">
                    {profile.dateOfBirth ? (
                      <>
                        {formatDob(profile.dateOfBirth)}
                        {profile.age != null && (
                          <span className="ml-2 text-xs text-gray-400 font-normal">(Age: {profile.age})</span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-500">Not set</span>
                    )}
                  </p>
                )}
              </div>
              {!editMode && <span className="text-xs text-gray-600 shrink-0 mt-1">Editable</span>}
            </div>

            {/* Gender */}
            <div className="flex items-center gap-3 px-5 py-4">
              <span className="text-lg w-7 shrink-0 text-center">⚧</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">Gender</p>
                {editMode ? (
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="bg-gray-700 border border-blue-500 text-white rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <p className="text-white font-medium">
                    {profile.gender ?? <span className="text-gray-500">Not set</span>}
                  </p>
                )}
              </div>
              {!editMode && <span className="text-xs text-gray-600 shrink-0">Editable</span>}
            </div>

          </div>
        </div>

        {/* ── Documents card ── */}
        {profile.isProfileComplete ? (
          <div className="bg-gray-800/60 backdrop-blur border border-gray-700/60 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-gray-700/60">
              <h3 className="text-white font-semibold text-sm">Verification Documents</h3>
              <p className="text-xs text-gray-500 mt-0.5">Submitted once — contact support to change</p>
            </div>
            <div className="divide-y divide-gray-700/40">
              <DocRow icon="🤳" label="Profile Photo" url={profile.profileImageUrl} />
              <DocRow icon="🪪" label="CNIC Image"    url={profile.cnicImageUrl}    />
            </div>
          </div>
        ) : (
          <div className="bg-blue-950/40 border border-blue-800/50 rounded-2xl px-5 py-4 text-sm text-blue-300">
            <p className="font-semibold mb-1">Documents not yet submitted</p>
            <p className="text-xs opacity-80 mb-3">Upload your documents to complete verification.</p>
            <button
              onClick={() => navigate("/complete-profile")}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-colors"
            >
              Upload Documents →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function EditableRow({
  icon, label, value, editValue, editMode, onChange, type = "text", placeholder, note,
}: {
  icon: string; label: string; value: string; editValue: string;
  editMode: boolean; onChange: (v: string) => void;
  type?: string; placeholder?: string; note?: string;
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <span className="text-lg w-7 shrink-0 text-center mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        {editMode ? (
          <>
            <input
              type={type}
              value={editValue}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="bg-gray-700 border border-blue-500 text-white rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            {note && <p className="text-xs text-amber-500/80 mt-1">{note}</p>}
          </>
        ) : (
          <p className="text-white font-medium break-all">{value || "—"}</p>
        )}
      </div>
      {!editMode && <span className="text-xs text-gray-600 shrink-0 mt-1">Editable</span>}
    </div>
  );
}

function ReadOnlyRow({ icon, label, value, mono }: { icon: string; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="text-lg w-7 shrink-0 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className={`text-white font-medium truncate ${mono ? "font-mono text-sm" : ""}`}>{value || "—"}</p>
      </div>
      <span className="text-xs text-gray-600 shrink-0">Read-only</span>
    </div>
  );
}

function DocRow({ icon, label, url }: { icon: string; label: string; url: string | null }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="text-gray-300 text-sm font-medium">{label}</span>
      </div>
      {url ? (
        <a
          href={`${BASE}${url}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          ✓ View
        </a>
      ) : (
        <span className="text-xs text-gray-600 italic">Not uploaded</span>
      )}
    </div>
  );
}
