import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform } from "react-native";
import PassengerDashboard from "@/screens/passenger/Dashboard";
import PassengerProfile from "@/screens/passenger/PassengerProfile";
import PassengerMyBookings from "@/screens/passenger/MyBookings";
import WalletScreen from "@/screens/wallet/WalletScreen";
import { COLORS } from "@/theme/colors";

export type PassengerTabParamList = {
  Dashboard: undefined;
  Bookings: undefined;
  Wallet: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<PassengerTabParamList>();

export default function PassengerTabs() {
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
          const icon: React.ComponentProps<typeof MaterialIcons>["name"] =
            route.name === "Dashboard"
              ? "home"
              : route.name === "Bookings"
                ? "receipt-long"
                : route.name === "Wallet"
                  ? "account-balance-wallet"
                  : "person";
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
      <Tab.Screen name="Dashboard" component={PassengerDashboard} />
      <Tab.Screen name="Bookings" component={PassengerMyBookings} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={PassengerProfile} />
    </Tab.Navigator>
  );
}
