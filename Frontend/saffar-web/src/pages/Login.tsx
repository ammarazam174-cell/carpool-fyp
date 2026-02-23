import { useState } from "react";
import api from "../api/axios";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Driver");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
  try {
    const res = await api.post("/auth/login", {
      phoneNumber: phone,
      role: role,
    });

    const data = res.data;

    // 🔐 Save token + role in context
    login(data.token, data.role);

    // 🔒 Force profile completion for new drivers
    if (data.role === "Driver" && !data.isProfileComplete) {
      navigate("/driver/profile");
      return;
    }

    // 🚦 Normal role redirect
    if (data.role === "Driver") {
      navigate("/driver");
    } else {
      navigate("/passenger");
    }

  } catch (err: any) {
    console.error("LOGIN ERROR:", err);
    alert(
      err?.response?.data ||
      err?.message ||
      "Unknown error"
    );
  }
};

  return (
    <div>
      <h2>Login</h2>

      <input
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="Driver">Driver</option>
        <option value="Passenger">Passenger</option>
      </select>

      <button onClick={handleLogin}>Login</button>
    </div>
  );
}