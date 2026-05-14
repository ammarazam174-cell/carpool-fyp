import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { formatPKT } from "../../utils/datetime";

type Ride = {
  id: string;
  fromLocation: string;
  toLocation: string;
  rideDate: string;
  availableSeats: number;
  driverName?: string;
  pickupStops: string[];      // ✅ ADD
  dropoffStops: string[];     // ✅ ADD
};

export default function RideDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");

  const rateDriver = async (rideId: string, stars: number) => {
    try {
      await api.post(`/Rides/${rideId}/rate`, stars);
      alert("Thanks for rating!");
    } catch {
      alert("Rating failed");
    }
  };

  useEffect(() => {
    api.get(`/rides/${id}`)
      .then(res => setRide(res.data))
      .catch(() => alert("Failed to load ride details"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBook = async () => {
  if (!pickup || !dropoff) {
    alert("Please select pickup and dropoff stop");
    return;
  }

  try {
    await api.post("/bookings", {
      rideId: ride?.id,
      seatsBooked: 1,
      pickupStop: pickup,
      dropoffStop: dropoff
    });

    alert("Booking request sent!");
    navigate("/passenger");
  } catch {
    alert("Booking failed");
  }
};

  if (loading) return <p>Loading...</p>;
  if (!ride) return <p>Ride not found</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Ride Details</h2>

      <p>
        <strong>Route:</strong> {ride.fromLocation} → {ride.toLocation}
      </p>

      <p>
        <strong>Date:</strong>{" "}
        {formatPKT(ride.rideDate)}
      </p>

      <p>
        <strong>Seats Available:</strong> {ride.availableSeats}
      </p>

      {/* ✅ Pickup Selection */}
      <div style={{ marginBottom: "10px" }}>
        <label>Pickup Stop:</label>
        <select value={pickup} onChange={(e) => setPickup(e.target.value)}>
          <option value="">Select Pickup</option>
          {ride.pickupStops?.map((stop, index) => (
            <option key={index} value={stop}>
              {stop}
            </option>
          ))}
        </select>
      </div>

      {/* ✅ Dropoff Selection */}
      <div style={{ marginBottom: "10px" }}>
        <label>Dropoff Stop:</label>
        <select value={dropoff} onChange={(e) => setDropoff(e.target.value)}>
          <option value="">Select Dropoff</option>
          {ride.dropoffStops?.map((stop, index) => (
            <option key={index} value={stop}>
              {stop}
            </option>
          ))}
        </select>
      </div>

      <button onClick={handleBook}>Book Ride</button>
      <br /><br />
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => rateDriver(ride.id, 5)}>⭐ 5 Stars</button>
    </div>
  );
}