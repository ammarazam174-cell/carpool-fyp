import RideStatusBadge from "./RideStatusBadge";

export default function RideCard({ ride }: any) {
  return (
    <div style={{ border: "1px solid #ddd", padding: "12px", marginTop: "10px" }}>
      <h3>
        {ride.fromLocation} → {ride.toLocation}
      </h3>
      <p>{new Date(ride.rideDate).toLocaleString()}</p>
      <p>Seats Left: {ride.availableSeats}</p>
      <RideStatusBadge status={ride.status} />
    </div>
  );
}
