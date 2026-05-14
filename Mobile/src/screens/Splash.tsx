import { ActivityIndicator, Text, View } from "react-native";

export default function Splash() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="mb-4 text-2xl font-bold text-primary">Saffar</Text>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}
