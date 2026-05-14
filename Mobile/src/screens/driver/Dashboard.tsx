import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarChart } from "react-native-chart-kit";
import { MaterialIcons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useNavigation,
  type CompositeNavigationProp,
} from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getDriverAnalytics, type DriverAnalytics } from "@/api/api";
import { useAuth } from "@/auth/AuthContext";
import { parseBackendDate } from "@/utils/datetime";
import type { DriverTabParamList } from "@/navigation/DriverTabs";
import type { DriverStackParamList } from "@/navigation/DriverStack";

type DashboardNav = CompositeNavigationProp<
  BottomTabNavigationProp<DriverTabParamList, "Dashboard">,
  NativeStackNavigationProp<DriverStackParamList>
>;
import { COLORS } from "@/theme/colors";
import StatCard from "@/components/StatCard";
import ActionButton from "@/components/ActionButton";
import Card from "@/components/Card";

type MDIconName = React.ComponentProps<typeof MaterialIcons>["name"];

const QUICK_ACTIONS: {
  label: string;
  icon: MDIconName;
  primary?: boolean;
}[] = [
  { label: "Create Ride", icon: "add-road",       primary: true },
  { label: "My Rides",    icon: "directions-car" },
  { label: "Bookings",    icon: "receipt-long"   },
  { label: "Vehicles",    icon: "commute"        },
  { label: "Profile",     icon: "person"         },
];

const fmt = (n: number | undefined | null) =>
  `PKR ${Number(n ?? 0).toLocaleString()}`;

const screenWidth = Dimensions.get("window").width;
const PAGE_PAD = 16;
// Chart card uses <Card tight> → padding 14 on each side.
const CHART_CARD_PAD = 14;
const CHART_WIDTH = screenWidth - PAGE_PAD * 2 - CHART_CARD_PAD * 2;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DriverDashboard() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const navigation = useNavigation<DashboardNav>();
  const isApproved = user?.status === "Approved";

  // Pull fresh user state every time the dashboard gains focus so admin
  // approvals flip the UI without needing a manual "Check Status" tap.
  useFocusEffect(
    useCallback(() => {
      console.log("[Dashboard] focus → refreshUser; current user:", user);
      void refreshUser();
    }, [refreshUser]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  const firstName = (user?.fullName ?? "Driver").split(" ")[0];
  const initial = (user?.fullName ?? "D").charAt(0).toUpperCase();

  const { data, isLoading, isError, refetch, isRefetching } =
    useQuery<DriverAnalytics>({
      queryKey: ["driver-analytics"],
      queryFn: getDriverAnalytics,
    });

  const onQuickAction = (label: string) => {
    console.log("[Dashboard] quick action:", label);
    if (label === "Profile") {
      navigation.navigate("Profile");
      return;
    }
    if (label === "Create Ride") {
      if (!isApproved) {
        Alert.alert(
          "Your profile is under review",
          "An admin needs to approve your account before you can create rides."
        );
        return;
      }
      navigation.navigate("CreateRide");
      return;
    }
    if (label === "Vehicles") {
      navigation.navigate("MyVehicles");
      return;
    }
    if (label === "My Rides") {
      navigation.navigate("MyRides");
      return;
    }
    if (label === "Bookings") {
      navigation.navigate("Bookings");
      return;
    }
    Alert.alert(label, `[NEW BUNDLE] "${label}" not wired yet.`);
  };

  const today = new Date().toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={{
        paddingHorizontal: PAGE_PAD,
        paddingTop: insets.top + 12,
        // Reserve space for the floating bottom tab bar (height 70 + inset).
        paddingBottom: insets.bottom + 96,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={COLORS.accent}
          colors={[COLORS.accent]}
        />
      }
    >
      {/* HEADER */}
      <View style={{ marginBottom: 22 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: COLORS.accent,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: COLORS.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ color: "white", fontSize: 18, fontWeight: "800" }}>
              {initial}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: "600" }}
            >
              {greeting()},
            </Text>
            <Text
              style={{
                color: COLORS.textLight,
                fontSize: 22,
                fontWeight: "800",
                letterSpacing: -0.3,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {firstName}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              maxWidth: 140,
            }}
          >
            <Text
              style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: "600" }}
              numberOfLines={1}
            >
              {today}
            </Text>
          </View>
        </View>
        <Text
          style={{
            color: COLORS.textLight,
            fontSize: 18,
            fontWeight: "700",
            letterSpacing: -0.2,
          }}
        >
          Driver Dashboard
        </Text>
        <Text
          style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}
        >
          Your performance at a glance
        </Text>
      </View>

      {/* APPROVAL BANNER */}
      {!isApproved ? (
        <View
          style={{
            marginBottom: 16,
            padding: 14,
            borderRadius: 14,
            backgroundColor: "rgba(245, 158, 11, 0.12)",
            borderWidth: 1,
            borderColor: "rgba(245, 158, 11, 0.45)",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(245, 158, 11, 0.25)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="hourglass-top" size={20} color={COLORS.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: COLORS.amber,
                fontSize: 14,
                fontWeight: "800",
                letterSpacing: -0.2,
              }}
            >
              Waiting for Admin Approval
            </Text>
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 12,
                marginTop: 4,
                lineHeight: 17,
              }}
            >
              You cannot create rides yet. We'll enable everything as soon as
              an admin reviews your profile.
            </Text>
            <Pressable
              onPress={() => refreshUser()}
              style={({ pressed }) => ({
                marginTop: 10,
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: "rgba(245, 158, 11, 0.2)",
                borderWidth: 1,
                borderColor: "rgba(245, 158, 11, 0.5)",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons name="refresh" size={14} color={COLORS.amber} />
              <Text
                style={{
                  color: COLORS.amber,
                  fontSize: 11.5,
                  fontWeight: "800",
                  letterSpacing: 0.3,
                }}
              >
                Check Status
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* QUICK ACTIONS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        overScrollMode="never"
        contentContainerStyle={{
          paddingHorizontal: PAGE_PAD,
          paddingVertical: 6,
          // Extra right padding so the last card (shadow included) is fully visible.
          paddingRight: PAGE_PAD + 12,
          gap: 12,
        }}
        style={{
          marginBottom: 20,
          marginHorizontal: -PAGE_PAD,
        }}
      >
        {QUICK_ACTIONS.map((a) => (
          <ActionButton
            key={a.label}
            label={a.label}
            icon={a.icon}
            active={a.primary}
            dim={a.label === "Create Ride" && !isApproved}
            onPress={() => onQuickAction(a.label)}
          />
        ))}
      </ScrollView>

      {/* STATS */}
      {isLoading ? (
        <StatSkeletonGrid />
      ) : isError || !data ? (
        <View
          style={{
            marginBottom: 20,
            padding: 14,
            borderRadius: 12,
            backgroundColor: COLORS.dangerBg,
            borderWidth: 1,
            borderColor: COLORS.dangerBorder,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <MaterialIcons name="error-outline" size={20} color={COLORS.dangerText} />
          <Text style={{ color: COLORS.dangerText, fontSize: 13, flex: 1 }}>
            Failed to load analytics. Pull down to refresh.
          </Text>
        </View>
      ) : (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <StatCard
            icon="attach-money"
            label="TOTAL EARNINGS"
            value={fmt(data.totalEarnings)}
            accent="#22C55E"
          />
          <StatCard
            icon="directions-car"
            label="TOTAL RIDES"
            value={String(data.totalRides)}
            accent="#10B981"
          />
          <StatCard
            icon="calendar-month"
            label="THIS MONTH"
            value={fmt(data.thisMonthEarnings)}
            accent="#84CC16"
          />
          <StatCard
            icon="flash-on"
            label="TODAY"
            value={fmt(data.todayEarnings)}
            accent="#F59E0B"
          />
        </View>
      )}

      {/* EARNINGS TREND */}
      <Card tight style={{ marginBottom: 20, overflow: "hidden" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text
              style={{
                color: COLORS.textLight,
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              Earnings Trend
            </Text>
            <Text
              style={{ color: COLORS.textDim, fontSize: 11, marginTop: 2 }}
            >
              Last 30 days · completed rides
            </Text>
          </View>
          <View
            style={{
              backgroundColor: COLORS.accentSoft,
              borderWidth: 1,
              borderColor: COLORS.accentEdge,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                color: COLORS.accent,
                fontSize: 11,
                fontWeight: "700",
              }}
            >
              {fmt(data?.totalEarnings)}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View
            style={{
              height: 200,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator color={COLORS.accent} />
          </View>
        ) : data && data.dailyData.length > 0 ? (
          <EarningsBarChart data={data.dailyData} />
        ) : (
          <View
            style={{
              height: 200,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons
              name="bar-chart"
              size={40}
              color={COLORS.textDim}
            />
            <Text
              style={{
                color: COLORS.textDim,
                fontSize: 13,
                marginTop: 6,
                textAlign: "center",
              }}
            >
              No earnings data yet — complete your first ride!
            </Text>
          </View>
        )}
      </Card>

      {/* RECENT RIDES */}
      <Card>
        <Text
          style={{
            color: COLORS.textLight,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 12,
          }}
        >
          Recent Rides
        </Text>

        {isLoading ? (
          <View style={{ gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  height: 60,
                  backgroundColor: COLORS.cardAlt,
                  borderRadius: 12,
                }}
              />
            ))}
          </View>
        ) : data && data.recentRides.length > 0 ? (
          <View style={{ gap: 10 }}>
            {data.recentRides.map((r, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: COLORS.cardAlt,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <MaterialIcons
                    name="trip-origin"
                    size={12}
                    color={COLORS.accent}
                  />
                  <Text
                    style={{
                      color: COLORS.textLight,
                      fontSize: 14,
                      fontWeight: "600",
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {r.fromAddress}
                    <Text style={{ color: COLORS.textDim, fontWeight: "400" }}>
                      {"  →  "}
                    </Text>
                    {r.toAddress}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 6,
                    marginLeft: 18,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <MaterialIcons
                      name="event"
                      size={11}
                      color={COLORS.textDim}
                    />
                    <Text style={{ color: COLORS.textDim, fontSize: 11 }}>
                      {parseBackendDate(r.departureTime).toLocaleDateString("en-PK", {
                        timeZone: "Asia/Karachi",
                        month: "short",
                        day: "numeric",
                      })}
                      {"  ·  "}
                      {r.passengers} pax
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: COLORS.accent,
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {fmt(r.earnings)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <MaterialIcons
              name="flag"
              size={32}
              color={COLORS.textDim}
            />
            <Text
              style={{
                color: COLORS.textDim,
                fontSize: 13,
                marginTop: 6,
              }}
            >
              No completed rides yet
            </Text>
          </View>
        )}

        <Pressable
          onPress={() => onQuickAction("My Rides")}
          style={({ pressed }) => ({
            marginTop: 14,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 12,
            paddingVertical: 10,
            alignItems: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: COLORS.textMuted,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            View All Rides →
          </Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

function StatSkeletonGrid() {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 20,
      }}
    >
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            flexBasis: "47%",
            flexGrow: 1,
            height: 80,
            backgroundColor: COLORS.card,
            borderRadius: 16,
          }}
        />
      ))}
    </View>
  );
}

function EarningsBarChart({
  data,
}: {
  data: { date: string; earnings: number }[];
}) {
  // Chart-kit renders best with ≤ 10 labels on mobile. Downsample if needed.
  const points = downsample(data, 10);

  return (
    <View style={{ overflow: "hidden", borderRadius: 12, alignItems: "center" }}>
      <BarChart
        data={{
          labels: points.map((p) => p.date.split(" ")[0]), // "01 May" -> "01"
          datasets: [{ data: points.map((p) => p.earnings) }],
        }}
        width={CHART_WIDTH}
        height={220}
        yAxisLabel=""
        yAxisSuffix=""
        fromZero
        withInnerLines
        segments={4}
        showBarTops={false}
        showValuesOnTopOfBars={false}
        chartConfig={{
          backgroundGradientFrom: COLORS.card,
          backgroundGradientTo: COLORS.card,
          fillShadowGradient: COLORS.accent,
          fillShadowGradientOpacity: 1,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
          propsForBackgroundLines: {
            stroke: COLORS.border,
            strokeDasharray: "3 4",
          },
          propsForLabels: { fontSize: "10" },
          barPercentage: 0.55,
        }}
        style={{
          borderRadius: 12,
          marginLeft: -8,
        }}
      />
    </View>
  );
}

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = Math.ceil(arr.length / max);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[i]);
  return out;
}
