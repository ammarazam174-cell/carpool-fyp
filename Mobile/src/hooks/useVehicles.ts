import { useEffect, useState } from "react";
import { listMyVehicles, type VehicleDto } from "@/api/api";

export const useVehicles = () => {
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVehicles = async () => {
    try {
    const data = await listMyVehicles();
    console.log("Vehicles DATA:", data);
    setVehicles(data);
    } catch (err) {
      console.log("Vehicle fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  return { vehicles, loading, refetch: fetchVehicles };
};