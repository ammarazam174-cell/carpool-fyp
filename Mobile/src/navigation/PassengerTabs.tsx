import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import PassengerDashboard from "@/screens/passenger/Dashboard";
import PassengerProfile from "@/screens/passenger/Profile";

export type PassengerTabParamList = {
  Browse: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<PassengerTabParamList>();

export default function PassengerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#2563eb",
      }}
    >
      <Tab.Screen name="Browse" component={PassengerDashboard} />
      <Tab.Screen name="Profile" component={PassengerProfile} />
    </Tab.Navigator>
  );
}
