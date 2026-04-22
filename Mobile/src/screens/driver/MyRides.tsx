import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { listMyDriverRides, type MyDriverRide } from "@/api/api";
import { useAuth } from "@/auth/AuthContext";
import { COLORS } from "@/theme/colors";
import type { DriverStackParamList } from "@/navigation/DriverStack";

type Nav = NativeStackNavigationProp<DriverStackParamList, "MyRides">;

type Status = "Active" | "InProgress" | "Completed" | "Cancelled";

const fmtPKR = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

function fmtDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-PK", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}

function statusMeta(status: string): {
  label: string;
  bg: string;
  border: string;
  fg: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
} {
  const s = (status ?? "").toLowerCase();
  if (s === "completed") {
    return {
      label: "Completed",
      bg: "rgba(34,197,94,0.15)",
      border: "rgba(34,197,94,0.45)",
      fg: "#22C55E",
      icon: "check-circle",
    };
  }
  if (s === "cancelled") {
    return {
      label: "Cancelled",
      bg: "rgba(239,68,68,0.15)",
      border: "rgba(239,68,68,0.45)",
      fg: "#F87171",
      icon: "cancel",
    };
  }
  if (s === "inprogress") {
    return {
      label: "In Progress",
      bg: "rgba(59,130,246,0.18)",
      border: "rgba(59,130,246,0.50)",
      fg: "#60A5FA",
      icon: "directions-car",
    };
  }
  // "Active" or anything upcoming
  return {
    label: "Upcoming",
    bg: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.45)",
    fg: "#60A5FA",
    icon: "schedule",
  };
}

function rideEarnings(r: MyDriverRide): number {
  if (r.status?.toLowerCase() !== "completed") return 0;
  return r.passengers.reduce(
    (sum, p) => sum + (p.totalPrice > 0 ? p.totalPrice : r.price * p.seatsBooked),
    0
  );
}

export default function MyRides() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const isApproved = user?.status === "Approved";

  const goCreateRide = useCallback(() => {
    if (!isApproved) {
      Alert.alert(
        "Your profile is under review",
        "An admin needs to approve your account before you can create rides."
      );
      return;
    }
    navigation.navigate("CreateRide");
  }, [isApproved, navigation]);

  const [rides, setRides] = useState<MyDriverRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const list = await listMyDriverRides();
      setRides(list);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? err?.message ?? "Could not load rides.";
      setError(typeof msg === "string" ? msg : "Could not load rides.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load("initial");
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* HEADER */}
      <LinearGradient
        colors={[COLORS.primaryMid, COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 20,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <MaterialIcons name="arrow-back" size={20} color="white" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "white",
                fontSize: 22,
                fontWeight: "800",
                letterSpacing: -0.3,
              }}
            >
              My Rides
            </Text>
            <Text
              style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}
            >
              Your ride history
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.12)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.22)",
            }}
          >
            <Text style={{ color: "white", fontSize: 11, fontWeight: "800" }}>
              {rides.length} ride{rides.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* BODY */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 10 }}>
            Loading your rides…
          </Text>
        </View>
      ) : error ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load("refresh")}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
        >
          <ErrorCard error={error} onRetry={() => load("initial")} />
        </ScrollView>
      ) : rides.length === 0 ? (
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 16,
            paddingBottom: insets.bottom + 24,
            justifyContent: "center",
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load("refresh")}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
        >
          <EmptyState onCreate={goCreateRide} isApproved={isApproved} />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 32,
            gap: 12,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load("refresh")}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
        >
          {rides.map((r) => (
            <RideCard key={r.id} ride={r} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function EmptyState({
  onCreate,
  isApproved,
}: {
  onCreate: () => void;
  isApproved: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 28,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: COLORS.accentSoft,
          borderWidth: 1,
          borderColor: COLORS.accentEdge,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <MaterialIcons name="directions-car" size={36} color={COLORS.accent} />
      </View>
      <Text
        style={{
          color: COLORS.textLight,
          fontSize: 18,
          fontWeight: "800",
          letterSpacing: -0.3,
        }}
      >
        No rides yet
      </Text>
      <Text
        style={{
          color: COLORS.textMuted,
          fontSize: 13,
          marginTop: 6,
          textAlign: "center",
          maxWidth: 260,
        }}
      >
        Create your first ride to start earning
      </Text>
      <Pressable
        onPress={onCreate}
        disabled={!isApproved}
        style={({ pressed }) => ({
          marginTop: 18,
          borderRadius: 12,
          overflow: "hidden",
          opacity: !isApproved ? 0.5 : 1,
          transform: [{ scale: pressed && isApproved ? 0.97 : 1 }],
        })}
      >
        <LinearGradient
          colors={[COLORS.accent, "#16A34A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 22,
            paddingVertical: 12,
          }}
        >
          <MaterialIcons name="add" size={18} color="white" />
          <Text style={{ color: "white", fontSize: 14, fontWeight: "800" }}>
            Create Ride
          </Text>
        </LinearGradient>
      </Pressable>
      {!isApproved ? (
        <Text
          style={{
            color: COLORS.amber,
            fontSize: 11.5,
            fontWeight: "700",
            marginTop: 10,
            textAlign: "center",
          }}
        >
          You cannot create rides until admin approval
        </Text>
      ) : null}
    </View>
  );
}

function ErrorCard({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <View
      style={{
        padding: 14,
        borderRadius: 14,
        backgroundColor: COLORS.dangerBg,
        borderWidth: 1,
        borderColor: COLORS.dangerBorder,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <MaterialIcons name="error-outline" size={20} color={COLORS.dangerText} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.dangerText, fontSize: 14, fontWeight: "700" }}>
          Couldn't load rides
        </Text>
        <Text style={{ color: COLORS.dangerText, fontSize: 12, marginTop: 4 }}>
          {error}
        </Text>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => ({
            marginTop: 10,
            alignSelf: "flex-start",
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: COLORS.accent,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>
            Try again
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function RideCard({ ride }: { ride: MyDriverRide }) {
  const meta = statusMeta(ride.status);
  const { date, time } = fmtDateTime(ride.departureTime);
  const seatsLeft = Math.max(0, ride.availableSeats);
  const passengers = ride.acceptedCount ?? ride.passengers.length;
  const earnings = rideEarnings(ride);
  const isCompleted = ride.status?.toLowerCase() === "completed";

  return (
    <View
      style={{
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
        elevation: 7,
      }}
    >
      <LinearGradient
        colors={[COLORS.card, COLORS.cardAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
      >
        {/* TOP — date + status */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: "700" }}>
              {date.toUpperCase()}
            </Text>
            <Text
              style={{
                color: COLORS.textLight,
                fontSize: 14,
                fontWeight: "800",
                marginTop: 2,
              }}
            >
              {time}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: meta.bg,
              borderWidth: 1,
              borderColor: meta.border,
            }}
          >
            <MaterialIcons name={meta.icon} size={12} color={meta.fg} />
            <Text
              style={{
                color: meta.fg,
                fontSize: 11,
                fontWeight: "800",
                letterSpacing: 0.3,
              }}
            >
              {meta.label}
            </Text>
          </View>
        </View>

        {/* ROUTE */}
        <View style={{ marginTop: 14 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <MaterialIcons name="trip-origin" size={14} color={COLORS.accent} />
            <Text
              style={{
                color: COLORS.textLight,
                fontSize: 16,
                fontWeight: "700",
                flex: 1,
              }}
              numberOfLines={1}
            >
              {ride.fromAddress}
            </Text>
          </View>
          <View
            style={{
              width: 1,
              height: 14,
              backgroundColor: COLORS.border,
              marginLeft: 6,
              marginVertical: 2,
            }}
          />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <MaterialIcons name="place" size={14} color="#F87171" />
            <Text
              style={{
                color: COLORS.textLight,
                fontSize: 16,
                fontWeight: "700",
                flex: 1,
              }}
              numberOfLines={1}
            >
              {ride.toAddress}
            </Text>
          </View>
        </View>

        {/* STATS */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginTop: 14,
          }}
        >
          <StatBox
            icon="people"
            label="Passengers"
            value={String(passengers)}
          />
          <StatBox
            icon="event-seat"
            label="Seats Left"
            value={String(seatsLeft)}
          />
          <StatBox
            icon="attach-money"
            label="Earnings"
            value={fmtPKR(earnings)}
            highlight
          />
        </View>

        {/* BOTTOM */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 14,
          }}
        >
          <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: "600" }}>
            {passengers} passenger{passengers === 1 ? "" : "s"} on board
          </Text>
        </View>

        {/* FOOTER */}
        {isCompleted ? (
          <View
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(34,197,94,0.12)",
              borderWidth: 1,
              borderColor: "rgba(34,197,94,0.40)",
            }}
          >
            <MaterialIcons name="check-circle" size={14} color={COLORS.accent} />
            <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: "700" }}>
              Ride completed · Earned {fmtPKR(earnings)}
            </Text>
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

function StatBox({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 12,
        padding: 10,
        backgroundColor: highlight ? "rgba(34,197,94,0.12)" : "rgba(0,0,0,0.22)",
        borderWidth: 1,
        borderColor: highlight ? COLORS.accentEdge : COLORS.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <MaterialIcons
          name={icon}
          size={12}
          color={highlight ? COLORS.accent : COLORS.textDim}
        />
        <Text
          style={{
            color: highlight ? COLORS.accent : COLORS.textDim,
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 0.3,
          }}
        >
          {label.toUpperCase()}
        </Text>
      </View>
      <Text
        style={{
          color: highlight ? COLORS.accent : COLORS.textLight,
          fontSize: 14,
          fontWeight: "800",
          marginTop: 4,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
