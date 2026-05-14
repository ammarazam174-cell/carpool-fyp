import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";

export default function Forbidden() {
  const { logout, user } = useAuth();
  const isAdmin = user?.role === "Admin";

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="mb-3 text-center text-xl font-semibold text-gray-900">
        {isAdmin ? "Admin is web-only" : "Access not allowed"}
      </Text>
      <Text className="mb-6 text-center text-gray-600">
        {isAdmin
          ? "Please sign in to the Saffar web app to manage admin features."
          : "Your account role is not supported in the mobile app."}
      </Text>
      <Pressable
        onPress={logout}
        className="rounded-lg bg-primary px-5 py-3 active:bg-primaryDark"
      >
        <Text className="font-semibold text-white">Sign out</Text>
      </Pressable>
    </View>
  );
}
