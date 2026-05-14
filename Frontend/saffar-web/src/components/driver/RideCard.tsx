import RideStatusBadge from "./RideStatusBadge";
import { formatPKT } from "../../utils/datetime";

export default function RideCard({ ride }: any) {
  return (
    <div style={{ border: "1px solid #ddd", padding: "12px", marginTop: "10px" }}>
      <h3>
        {ride.fromLocation} → {ride.toLocation}
      </h3>
      <p>{formatPKT(ride.rideDate)}</p>
      <p>Seats Left: {ride.availableSeats}</p>
      <RideStatusBadge status={ride.status} />
    </div>
  );
}
