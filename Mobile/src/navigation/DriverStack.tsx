import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DriverTabs from "./DriverTabs";
import CreateRide from "@/screens/driver/CreateRide";
import MyVehicles from "@/screens/driver/MyVehicles";
import MyRides from "@/screens/driver/MyRides";
import BookingsScreen from "@/screens/driver/BookingsScreen";
import AddVehicle from "@/screens/auth/AddVehicle";
import VerifyEmailChange from "@/screens/driver/VerifyEmailChange";
import TopUpScreen from "@/screens/wallet/TopUpScreen";

export type DriverStackParamList = {
  Tabs: undefined;
  CreateRide: undefined;
  MyRides: undefined;
  MyVehicles: undefined;
  Bookings: undefined;
  AddVehicle: { mode: "normal" } | undefined;
  VerifyEmailChange: { newEmail: string };
  WalletTopUp: undefined;
};

const Stack = createNativeStackNavigator<DriverStackParamList>();

export default function DriverStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={DriverTabs} />
      <Stack.Screen
        name="CreateRide"
        component={CreateRide}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="MyRides"
        component={MyRides}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="MyVehicles"
        component={MyVehicles}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="AddVehicle"
        component={AddVehicle}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="VerifyEmailChange"
        component={VerifyEmailChange}
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
