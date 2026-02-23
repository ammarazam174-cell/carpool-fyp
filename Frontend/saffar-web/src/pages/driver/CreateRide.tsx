import { useEffect, useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
export default function CreateRide() {
  const navigate = useNavigate();

  // -----------------------------
  // VEHICLES
  // -----------------------------
  const [vehicles, setVehicles] = useState<any[]>([]);

  // -----------------------------
  // BASIC RIDE INFO STATE
  // -----------------------------
  const [form, setForm] = useState({
    vehicleId: "",
    fromAddress: "",
    toAddress: "",
    departureTime: "",
    availableSeats: 0,
    price: 0,
  });

  // -----------------------------
  // STOPS STATE
  // -----------------------------
  const [pickupStops, setPickupStops] = useState<string[]>([]);
  const [dropoffStops, setDropoffStops] = useState<string[]>([]);

  // -----------------------------
  // INPUT HANDLER
  // -----------------------------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "availableSeats" || name === "price"
          ? Number(value)
          : value,
    }));
  };

  // -----------------------------
  // SUBMIT HANDLER
  // -----------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.vehicleId) {
      alert("Please select a vehicle first");
      return;
    }

    if (!form.departureTime) {
      alert("Please select departure date & time");
      return;
    }

    const formattedForm = {
      ...form,
      departureTime: new Date(form.departureTime).toISOString(),
      pickupStops,
      dropoffStops,
    };

    console.log("SENDING:", formattedForm);

    try {
      const res = await api.post("/rides", formattedForm);
      alert(res.data.message);
      navigate("/driver/my-rides");
    } catch (error: any) {
      console.log(error.response?.data);
      alert(JSON.stringify(error.response?.data));
    }
  };

  // -----------------------------
  // LOAD VEHICLES (GUARD)
  // -----------------------------
  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const res = await api.get("/vehicle/my");
        if (res.data.length === 0) {
          alert("Please add a vehicle first");
          navigate("/driver/add-vehicle");
        } else {
          setVehicles(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadVehicles();
  }, [navigate]);
  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div style={{ padding: "20px", maxWidth: "500px" }}>
      <h2>Create Ride</h2>

      <form onSubmit={handleSubmit}>
        <label>Vehicle</label>
        <select
          value={form.vehicleId}
          onChange={(e) =>
            setForm({ ...form, vehicleId: e.target.value })
          }
        >
          <option value="">Select Vehicle</option>

          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.model} - {v.city}
            </option>
          ))}
        </select>

        <input
          name="fromAddress"
          placeholder="From City"
          onChange={handleChange}
        />
        <br /><br />

        <input
          name="toAddress"
          placeholder="To City"
          onChange={handleChange}
        />
        <br /><br />

        <input
          type="datetime-local"
          name="departureTime"
          value={form.departureTime}
          onChange={handleChange}
        />
        <br /><br />

        <label>Available Seats</label>
        <input
          type="number"
          name="availableSeats"
          min={1}
          placeholder="e.g. 3"
          value={form.availableSeats}
          onChange={handleChange}
        />
        <br /><br />

        <label>Fare (PKR)</label>
        <input
          type="number"
          name="price"
          placeholder="e.g. 1500"
          value={form.price}
          onChange={handleChange}
        />
        <br /><br />


        <h4>Pickup Stops</h4>
        {pickupStops.map((s, i) => (
          <input
            key={i}
            value={s}
            onChange={(e) => {
              const x = [...pickupStops];
              x[i] = e.target.value;
              setPickupStops(x);
            }}
          />
        ))}
        <button type="button" onClick={() => setPickupStops([...pickupStops, ""])}>
          + Add Pickup
        </button>

        <h4>Dropoff Stops</h4>
        {dropoffStops.map((s, i) => (
          <input
            key={i}
            value={s}
            onChange={(e) => {
              const x = [...dropoffStops];
              x[i] = e.target.value;
              setDropoffStops(x);
            }}
          />
        ))}
        <button
          type="button"
          onClick={() => setDropoffStops([...dropoffStops, ""])}
          style={{ marginTop: "10px", display: "block" }}
        >
          + Add Dropoff
        </button>
        <div style={{ marginTop: "30px" }}>
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: "#22c55e",
              color: "white",
              border: "none",
              fontWeight: "bold",
              fontSize: "16px",
              cursor: "pointer"
            }}
          >
            Create Ride
          </button>
        </div>
      </form>
    </div>
  );
}