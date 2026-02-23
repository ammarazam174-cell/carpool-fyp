export default function RideStatusBadge({ status }: { status: string }) {
  const colors: any = {
    Scheduled: "orange",
    InProgress: "blue",
    Completed: "green",
  };

  return (
    <span style={{ color: colors[status] || "gray" }}>
      ● {status}
    </span>
  );
}