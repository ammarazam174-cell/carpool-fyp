import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@/auth/AuthContext";
import Splash from "@/screens/Splash";
import Forbidden from "@/screens/Forbidden";
import CompleteProfile from "@/screens/auth/CompleteProfile";
import UnderReview from "@/screens/auth/UnderReview";
import AddVehicle from "@/screens/auth/AddVehicle";
import AuthStack from "./AuthStack";
import DriverStack from "./DriverStack";
import PassengerTabs from "./PassengerTabs";

export type CompleteProfileStackParamList = {
  CompleteProfile: undefined;
  UnderReview: undefined;
};

export type AddVehicleStackParamList = {
  AddVehicle: { mode: "onboarding" };
};

const CompleteStack = createNativeStackNavigator<CompleteProfileStackParamList>();
const VehicleStack = createNativeStackNavigator<AddVehicleStackParamList>();

function CompleteProfileStack() {
  return (
    <CompleteStack.Navigator
      screenOptions={{ headerShown: false, gestureEnabled: false }}
    >
      <CompleteStack.Screen name="CompleteProfile" component={CompleteProfile} />
      <CompleteStack.Screen name="UnderReview" component={UnderReview} />
    </CompleteStack.Navigator>
  );
}

function AddVehicleStack() {
  return (
    <VehicleStack.Navigator
      screenOptions={{ headerShown: false, gestureEnabled: false }}
    >
      <VehicleStack.Screen
        name="AddVehicle"
        component={AddVehicle}
        initialParams={{ mode: "onboarding" }}
      />
    </VehicleStack.Navigator>
  );
}

function pickStack(user: ReturnType<typeof useAuth>["user"]) {
  if (!user) return "auth";
  if (user.role === "Admin") return "forbidden";
  if (!user.isProfileComplete) return "complete-profile";
  if (user.role === "Driver" && !user.hasVehicle) return "add-vehicle";
  if (user.role === "Driver") return "driver";
  if (user.role === "Passenger") return "passenger";
  return "auth";
}

export default function RootNavigator() {
  const { user, ready } = useAuth();

  if (!ready) return <Splash />;

  const target = pickStack(user);
  console.log("[RootNav] user:", user, "→", target);

  return (
  <NavigationContainer key={target}>
    {target === "auth" && <AuthStack />}
    {target === "forbidden" && <Forbidden />}
    {target === "complete-profile" && <CompleteProfileStack />}
    {target === "add-vehicle" && <AddVehicleStack />}
    {target === "driver" && <DriverStack />}
    {target === "passenger" && <PassengerTabs />}
  </NavigationContainer>
);
}
