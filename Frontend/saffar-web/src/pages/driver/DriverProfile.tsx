import { useEffect, useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
type Profile = {
    fullName: string;
    age: number;
    phoneNumber: string;
    profileImageUrl: string;
    rating: number;
};

export default function DriverProfile() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [image, setImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const res = await api.get("/Users/driver/profile");
            setProfile({
                fullName: res.data.fullName ?? "",
                age: res.data.age ?? 0,
                phoneNumber: res.data.phoneNumber ?? "",
                profileImageUrl: res.data.profileImageUrl ?? "",
                rating: res.data.rating ?? 0
            });
        } catch {
            alert("Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async () => {
        if (!profile) return;

        const formData = new FormData();
        formData.append("FullName", profile.fullName || "");
        formData.append("Age", profile.age.toString());

        if (image) {
            formData.append("ProfileImage", image);
        }

        try {
            setSaving(true);
            await api.put("/Users/driver/profile", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            alert("Profile updated successfully");

            // 🔥 Redirect to dashboard after completion
            navigate("/driver");
        } catch {
            alert("Update failed");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p style={{ padding: 20 }}>Loading profile...</p>;
    if (!profile) return null;

    return (
        <div
            style={{
                maxWidth: "500px",
                margin: "40px auto",
                padding: "30px",
                borderRadius: "20px",
                background: "linear-gradient(145deg, #1f2937, #111827)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                color: "#fff",
            }}
        >
            <div className="flex items-center gap-2 mt-2">
                <span className="text-yellow-400 text-xl">⭐</span>
                <span className="text-white font-semibold text-lg">
                    {profile.rating?.toFixed(1)}
                </span>
            </div>
            <h2 style={{ marginBottom: "20px" }}>Driver Profile</h2>

            {profile.profileImageUrl && (
                <img
                    src={`http://localhost:5128${profile.profileImageUrl}`}
                    alt="Profile"
                    style={{
                        width: "120px",
                        height: "120px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        marginBottom: "20px",
                        border: "3px solid #3b82f6",
                    }}
                />
            )}

            <input
                type="text"
                placeholder="Full Name"
                value={profile.fullName || ""}
                onChange={(e) =>
                    setProfile({ ...profile, fullName: e.target.value })
                }
                style={inputStyle}
            />

            <input
                type="number"
                placeholder="Age"
                value={profile.age || ""}
                onChange={(e) =>
                    setProfile({ ...profile, age: Number(e.target.value) })
                }
                style={inputStyle}
            />

            <input
                type="file"
                onChange={(e) =>
                    setImage(e.target.files ? e.target.files[0] : null)
                }
                style={{ marginTop: "15px", color: "#fff" }}
            />

            <button
                onClick={updateProfile}
                disabled={saving}
                style={{
                    marginTop: "20px",
                    width: "100%",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(90deg,#2563eb,#7c3aed)",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                }}
            >
                {saving ? "Saving..." : "Update Profile"}
            </button>
        </div>

    );
}

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #374151",
    backgroundColor: "#111827",
    color: "#fff",
};