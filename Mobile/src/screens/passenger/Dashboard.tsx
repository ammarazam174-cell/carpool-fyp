import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { listRides } from "@/api/api";
import { useAuth } from "@/auth/AuthContext";
import type { Ride } from "@/types/ride";

export default function PassengerDashboard() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["rides"],
    queryFn: listRides,
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-red-600">
          Could not load rides: {String((error as Error)?.message ?? "unknown")}
        </Text>
      </View>
    );
  }

  return (
    <FlatList<Ride>
      data={data ?? []}
      keyExtractor={(r) => r.id}
      contentContainerClassName="p-4"
      ListHeaderComponent={
        <View className="mb-3">
          <Text className="text-2xl font-bold text-gray-900">
            Hi, {user?.fullName.split(" ")[0] ?? "there"}
          </Text>
          <Text className="text-gray-600">Available rides</Text>
        </View>
      }
      ListEmptyComponent={
        <Text className="mt-10 text-center text-gray-500">
          No rides available right now.
        </Text>
      }
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
      }
      renderItem={({ item }) => (
        <View className="mb-3 rounded-lg border border-gray-200 bg-white p-4">
          <Text className="text-base font-semibold text-gray-900">
            {item.fromAddress} → {item.toAddress}
          </Text>
          <Text className="text-gray-600">
            {new Date(item.departureTime).toLocaleString()}
          </Text>
          <Text className="mt-1 text-gray-700">
            Driver: {item.driverName} · {item.vehicleMake} {item.vehicleModel}
          </Text>
          <Text className="mt-1 text-gray-700">
            {item.availableSeats}/{item.totalSeats} seats · Rs {item.price}
          </Text>
        </View>
      )}
    />
  );
}
