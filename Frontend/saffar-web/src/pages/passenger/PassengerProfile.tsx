import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

const BASE = "http://localhost:5000";

type Profile = {
  fullName: string;
  phoneNumber: string;
  cnic: string;
  age: number | null;
  gender: string;
  profileImageUrl: string;
  cnicImageUrl: string;
  isProfileComplete: boolean;
};

export default function PassengerProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [age, setAge]         = useState("");
  const [gender, setGender]   = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    api.get("/users/passenger/profile")
      .then((res) => {
        setProfile(res.data);
        setAge(res.data.age != null ? String(res.data.age) : "");
        setGender(res.data.gender ?? "");
      })
      .catch(() => alert("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("age", age);
      formData.append("gender", gender);
      await api.post("/users/passenger/profile", formData);
      alert("✅ Profile saved successfully");
      navigate("/passenger");
    } catch {
      alert("❌ Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-10">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">

        <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">Passenger Profile</h2>
        <p className="text-center text-gray-500 text-sm mb-6">Manage your profile information</p>

        {/* Profile avatar */}
        {profile?.profileImageUrl && (
          <div className="flex justify-center mb-5">
            <img
              src={`${BASE}${profile.profileImageUrl}`}
              alt="Profile"
              className="w-24 h-24 rounded-full border-4 border-blue-500 object-cover shadow"
            />
          </div>
        )}

        {/* Read-only account info */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5 space-y-2 text-sm">
          <InfoRow icon="👤" label="Full Name"    value={profile?.fullName ?? ""} />
          <div className="border-t border-gray-200" />
          <InfoRow icon="📞" label="Phone"        value={profile?.phoneNumber ?? ""} />
          <div className="border-t border-gray-200" />
          <InfoRow icon="🪪" label="CNIC"         value={profile?.cnic ?? ""} mono />
        </div>

        <div className="space-y-4">

          {/* AGE */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Age <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter your age"
              className="w-full border border-gray-300 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* GENDER */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="border-t border-gray-100" />

          {/* Documents — view-only */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Verification Documents</p>

            {profile?.isProfileComplete ? (
              <>
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-700">
                  <span>🔒</span>
                  <span>Documents already submitted and under admin review. Contact support for any changes.</span>
                </div>
                <div className="space-y-2">
                  <DocViewRow label="Profile Photo" url={profile.profileImageUrl} />
                  <DocViewRow label="CNIC Image"    url={profile.cnicImageUrl ?? ""} />
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                <span>ℹ</span>
                <span>
                  Documents not yet submitted.{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/complete-profile")}
                    className="font-semibold underline hover:text-blue-900"
                  >
                    Upload documents →
                  </button>
                </span>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-md"
          >
            {saving ? "Saving…" : "Save Profile"}
          </button>

        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, mono }: { icon: string; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 w-5 text-center">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
        <p className={`font-medium text-gray-700 ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
      </div>
    </div>
  );
}

function DocViewRow({ label, url }: { label: string; url: string }) {
  if (!url) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
        <span className="text-gray-500">{label}</span>
        <span className="text-xs text-gray-400">Not uploaded</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
      <span className="text-gray-700 font-medium">{label}</span>
      <a
        href={`${BASE}${url}`}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-green-700 font-semibold hover:underline"
      >
        ✓ View
      </a>
    </div>
  );
}
