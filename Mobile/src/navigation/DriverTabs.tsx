import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform } from "react-native";
import DriverDashboard from "@/screens/driver/Dashboard";
import DriverProfile from "@/screens/driver/Profile";
import { COLORS } from "@/theme/colors";

export type DriverTabParamList = {
  Dashboard: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<DriverTabParamList>();

export default function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopWidth: 0,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          height: 70,
          paddingBottom: Platform.OS === "ios" ? 16 : 10,
          paddingTop: 10,
          // Floating feel
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 16,
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarIcon: ({ color, focused }) => {
          const icon = route.name === "Dashboard" ? "dashboard" : "person";
          return (
            <MaterialIcons
              name={icon}
              size={focused ? 26 : 22}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DriverDashboard} />
      <Tab.Screen name="Profile" component={DriverProfile} />
    </Tab.Navigator>
  );
}
