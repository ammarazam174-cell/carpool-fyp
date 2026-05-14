import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PassengerTabs from "./PassengerTabs";
import RideDetailScreen from "@/screens/passenger/RideDetailScreen";
import RideTrackingScreen from "@/screens/passenger/RideTrackingScreen";
import TopUpScreen from "@/screens/wallet/TopUpScreen";
import type { Ride } from "@/types/ride";
import type { PassengerLocation } from "@/types/location";

export type PassengerStackParamList = {
  Tabs: undefined;
  RideDetail: { ride: Ride; location: PassengerLocation };
  RideTracking: {
    rideId: string;
    from: string;
    to: string;
    driverName?: string;
  };
  WalletTopUp: undefined;
};

const Stack = createNativeStackNavigator<PassengerStackParamList>();

export default function PassengerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={PassengerTabs} />
      <Stack.Screen
        name="RideDetail"
        component={RideDetailScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="RideTracking"
        component={RideTrackingScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="WalletTopUp"
        component={TopUpScreen}
        options={{ animation: "slide_from_right" }}
      />
    </Stack.Navigator>
  );
}
