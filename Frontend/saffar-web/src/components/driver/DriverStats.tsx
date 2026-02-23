export default function DriverStats({ rides }: any) {
  const active = rides.filter((r: any) => r.status === "Scheduled").length;
  const completed = rides.filter((r: any) => r.status === "Completed").length;

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      <div>🚗 Total Rides: {rides.length}</div>
      <div>🟡 Active: {active}</div>
      <div>🟢 Completed: {completed}</div>
      <div>✅ Verified Driver</div>
    </div>
  );
}