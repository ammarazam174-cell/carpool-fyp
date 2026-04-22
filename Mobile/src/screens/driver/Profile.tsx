import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";

export default function DriverProfile() {
  const { user, logout } = useAuth();
  return (
    <View className="flex-1 bg-white p-6" style={{ paddingBottom: 100 }}>
      <Text className="mb-4 text-2xl font-bold text-gray-900">Profile</Text>

      <Row label="Name" value={user?.fullName ?? "—"} />
      <Row label="Role" value={user?.role ?? "—"} />
      <Row label="Status" value={user?.status ?? "—"} />
      <Row label="Verified" value={user?.isVerified ? "Yes" : "No"} />
      <Row
        label="Profile complete"
        value={user?.isProfileComplete ? "Yes" : "No"}
      />

      <Pressable
        onPress={logout}
        className="mt-8 items-center rounded-lg border border-red-500 px-4 py-3 active:bg-red-50"
      >
        <Text className="font-semibold text-red-600">Sign out</Text>
      </Pressable>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 flex-row justify-between border-b border-gray-100 pb-3">
      <Text className="text-gray-600">{label}</Text>
      <Text className="font-medium text-gray-900">{value}</Text>
    </View>
  );
}
