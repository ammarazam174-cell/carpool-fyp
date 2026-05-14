import { useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";

export default function AddVehicle() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    make: "",
    model: "",
    plateNumber: "",
    seats: 4,
  });
  const submit = async () => {
  try {
    await api.post("/Vehicle", {
      make: form.make,
      model: form.model,
      plateNumber: form.plateNumber,
      seats: form.seats,
    });

    alert("Vehicle added successfully");
    navigate("/driver");
  } catch (err) {
    console.error(err);
    alert("Failed to add vehicle");
  }
};

  return (
    <div style={{ padding: "20px", maxWidth: "400px" }}>
      <h2>Add Vehicle</h2>

      <input placeholder="Make"
        value={form.make}
        onChange={e => setForm({ ...form, make: e.target.value })} />

      <input placeholder="Model"
        value={form.model}
        onChange={e => setForm({ ...form, model: e.target.value })} />

      <input placeholder="Plate Number"
        value={form.plateNumber}
        onChange={e => setForm({ ...form, plateNumber: e.target.value })} />

      <input type="number" placeholder="Seats"
        value={form.seats}
        onChange={e => setForm({ ...form, seats: Number(e.target.value) })} />

      <button onClick={submit}>Save Vehicle</button>
    </div>
  );
}