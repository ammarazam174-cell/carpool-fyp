import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
import { completeRide, listMyDriverRides, startRide, type MyDriverRide } from "@/api/api";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { useAuth } from "@/auth/AuthContext";
import { COLORS } from "@/theme/colors";
import { fmtRideDateTime } from "@/utils/datetime";
import type { DriverStackParamList } from "@/navigation/DriverStack";

type Nav = NativeStackNavigationProp<DriverStackParamList, "MyRides">;

type Status = "Active" | "InProgress" | "Completed" | "Cancelled";

const fmtPKR = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

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
  const [startingId, setStartingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const onStartRide = useCallback(async (rideId: string) => {
    setStartingId(rideId);
    try {
      await startRide(rideId);
      // Optimistic: flip status locally so UI reflects immediately.
      setRides((prev) =>
        prev.map((r) => (r.id === rideId ? { ...r, status: "InProgress" } : r))
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (typeof err?.response?.data === "string" ? err.response.data : null) ??
        err?.message ??
        "Could not start ride.";
      Alert.alert(
        "Start ride failed",
        typeof msg === "string" ? msg : "Could not start ride."
      );
    } finally {
      setStartingId(null);
    }
  }, []);

  const onCompleteRide = useCallback((rideId: string) => {
    Alert.alert(
      "Complete ride?",
      "Mark this ride as completed. Earnings will be credited to your profile.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          style: "default",
          onPress: async () => {
            setCompletingId(rideId);
            try {
              await completeRide(rideId);
              setRides((prev) =>
                prev.map((r) => (r.id === rideId ? { ...r, status: "Completed" } : r))
              );
            } catch (err: any) {
              const msg =
                err?.response?.data?.message ??
                (typeof err?.response?.data === "string" ? err.response.data : null) ??
                err?.message ??
                "Could not complete ride.";
              Alert.alert(
                "Complete ride failed",
                typeof msg === "string" ? msg : "Could not complete ride."
              );
            } finally {
              setCompletingId(null);
            }
          },
        },
      ]
    );
  }, []);

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

  // Auto-track the first in-progress ride. Backend's StartRide enforces that
  // only one ride per driver can be InProgress at a time, so picking the first
  // match is safe in practice.
  const activeRide = rides.find(
    (r) => (r.status ?? "").toLowerCase() === "inprogress"
  );
  const tracker = useDriverLocationTracker(
    activeRide?.id ?? null,
    !!activeRide
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

      {/* LIVE SHARING BANNER */}
      {activeRide ? (
        <LiveSharingBanner
          status={tracker.status}
          lastSentAt={tracker.lastSentAt}
          error={tracker.lastError}
        />
      ) : null}

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
            <RideCard
              key={r.id}
              ride={r}
              onStart={onStartRide}
              onComplete={onCompleteRide}
              starting={startingId === r.id}
              completing={completingId === r.id}
            />
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

// Ride is "startable" (i.e. should show the Start button) when:
//   - status is Active (aka "Upcoming")
//   - at least one accepted passenger
// Hidden for InProgress / Completed / Cancelled / no passengers.
function canStartRide(ride: MyDriverRide): boolean {
  const status = (ride.status ?? "").toLowerCase();
  if (status !== "active") return false;
  const accepted = ride.acceptedCount ?? ride.passengers.length ?? 0;
  return accepted > 0;
}

function RideCard({
  ride,
  onStart,
  onComplete,
  starting,
  completing,
}: {
  ride: MyDriverRide;
  onStart: (rideId: string) => void;
  onComplete: (rideId: string) => void;
  starting: boolean;
  completing: boolean;
}) {
  const [showPassengers, setShowPassengers] = useState(false);
  const meta = statusMeta(ride.status);
  const { date, time } = fmtRideDateTime(ride.departureTime);
  const seatsLeft = Math.max(0, ride.availableSeats);
  const passengers = ride.acceptedCount ?? ride.passengers.length;
  const earnings = rideEarnings(ride);
  const isCompleted = ride.status?.toLowerCase() === "completed";
  const isInProgress = ride.status?.toLowerCase() === "inprogress";
  const startable = canStartRide(ride);

  // Subtle pulse on the Start button while a ride is ready to launch.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!startable) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.03,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [startable, pulse]);

  return (
    <View
      style={{
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.32,
        shadowRadius: 18,
        elevation: 9,
      }}
    >
      <LinearGradient
        colors={[COLORS.card, COLORS.cardAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 18 }}
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

        {/* PASSENGER DETAILS (collapsible) */}
        {ride.passengers.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <Pressable
              onPress={() => setShowPassengers((v) => !v)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 14,
                paddingVertical: 11,
                borderRadius: 12,
                backgroundColor: COLORS.accentSoft,
                borderWidth: 1,
                borderColor: COLORS.accentEdge,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: COLORS.accent, fontSize: 12.5, fontWeight: "800", letterSpacing: 0.2 }}>
                👥 {ride.passengers.length} Passenger{ride.passengers.length === 1 ? "" : "s"} on board
              </Text>
              <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: "700" }}>
                {showPassengers ? "▲ Hide" : "▼ Details"}
              </Text>
            </Pressable>

            {showPassengers ? (
              <View style={{ marginTop: 8, gap: 8 }}>
                {ride.passengers.map((p) => {
                  const fare = p.totalPrice > 0 ? p.totalPrice : ride.price * p.seatsBooked;
                  const pickup = p.passengerAddress || p.pickupStop;
                  const initial = (p.fullName || "?").charAt(0).toUpperCase();
                  return (
                    <View
                      key={p.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: 12,
                        borderRadius: 14,
                        backgroundColor: "rgba(255,255,255,0.05)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.1)",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: COLORS.accentSoft,
                          borderWidth: 1,
                          borderColor: COLORS.accentEdge,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: COLORS.accent, fontSize: 15, fontWeight: "800" }}>
                          {initial}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{ color: COLORS.textLight, fontSize: 13, fontWeight: "700" }}
                          numberOfLines={1}
                        >
                          {p.fullName}
                        </Text>
                        <Text
                          style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 1 }}
                          numberOfLines={1}
                        >
                          {p.phoneNumber}
                        </Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                          <Text
                            style={{
                              color: COLORS.textMuted,
                              fontSize: 10,
                              fontWeight: "700",
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 999,
                              backgroundColor: "rgba(255,255,255,0.06)",
                              borderWidth: 1,
                              borderColor: COLORS.border,
                            }}
                          >
                            🪑 {p.seatsBooked} seat{p.seatsBooked === 1 ? "" : "s"}
                          </Text>
                          {pickup ? (
                            <Text
                              style={{
                                color: COLORS.textMuted,
                                fontSize: 10,
                                fontWeight: "700",
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 999,
                                backgroundColor: "rgba(255,255,255,0.06)",
                                borderWidth: 1,
                                borderColor: COLORS.border,
                                maxWidth: 200,
                              }}
                              numberOfLines={1}
                            >
                              📍 {pickup}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>Fare</Text>
                        <Text style={{ color: COLORS.accent, fontSize: 13, fontWeight: "800", marginTop: 1 }}>
                          {fmtPKR(fare)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

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
        ) : isInProgress ? (
          <View style={{ marginTop: 12, gap: 10 }}>
            {/* Live tracking pill */}
            <View
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: "rgba(34,197,94,0.14)",
                borderWidth: 1,
                borderColor: "rgba(34,197,94,0.45)",
              }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  backgroundColor: COLORS.accent,
                }}
              />
              <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: "800", letterSpacing: 0.3 }}>
                LIVE TRACKING ON
              </Text>
            </View>

            {/* In-progress info banner */}
            <View
              style={{
                padding: 11,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(59,130,246,0.12)",
                borderWidth: 1,
                borderColor: "rgba(59,130,246,0.40)",
              }}
            >
              <MaterialIcons name="directions-car" size={14} color="#60A5FA" />
              <Text
                style={{ color: "#93C5FD", fontSize: 12, fontWeight: "700", flex: 1 }}
                numberOfLines={2}
              >
                Sharing your live location with passengers
              </Text>
            </View>

            {/* Complete Ride — premium CTA matching Start Ride polish */}
            <View
              style={{
                shadowColor: COLORS.accent,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Pressable
                onPress={() => onComplete(ride.id)}
                disabled={completing}
                style={({ pressed }) => ({
                  borderRadius: 14,
                  overflow: "hidden",
                  opacity: completing ? 0.7 : 1,
                  transform: [{ scale: pressed && !completing ? 0.97 : 1 }],
                })}
              >
                <LinearGradient
                  colors={[COLORS.accent, "#16A34A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 14,
                  }}
                >
                  {completing ? (
                    <>
                      <ActivityIndicator color="white" size="small" />
                      <Text
                        style={{
                          color: "white",
                          fontSize: 14.5,
                          fontWeight: "800",
                          letterSpacing: 0.3,
                        }}
                      >
                        Completing…
                      </Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="check-circle" size={20} color="white" />
                      <Text
                        style={{
                          color: "white",
                          fontSize: 14.5,
                          fontWeight: "800",
                          letterSpacing: 0.3,
                        }}
                      >
                        Complete Ride
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        ) : ride.status?.toLowerCase() === "active" ? (
          <StartRideCTA
            rideId={ride.id}
            passengers={passengers}
            startable={startable}
            starting={starting}
            pulse={pulse}
            onStart={onStart}
          />
        ) : null}
      </LinearGradient>
    </View>
  );
}

function StartRideCTA({
  rideId,
  passengers,
  startable,
  starting,
  pulse,
  onStart,
}: {
  rideId: string;
  passengers: number;
  startable: boolean;
  starting: boolean;
  pulse: Animated.Value;
  onStart: (id: string) => void;
}) {
  return (
    <View style={{ marginTop: 12, gap: 8 }}>
      {/* Readiness banner — green when ready, amber otherwise */}
      <View
        style={{
          padding: 10,
          borderRadius: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: startable
            ? "rgba(34,197,94,0.12)"
            : "rgba(245,158,11,0.12)",
          borderWidth: 1,
          borderColor: startable
            ? "rgba(34,197,94,0.40)"
            : "rgba(245,158,11,0.40)",
        }}
      >
        <MaterialIcons
          name={startable ? "check-circle" : "hourglass-empty"}
          size={14}
          color={startable ? COLORS.accent : COLORS.amber}
        />
        <Text
          style={{
            color: startable ? COLORS.accent : COLORS.amber,
            fontSize: 12,
            fontWeight: "700",
            flex: 1,
          }}
        >
          {startable
            ? `${passengers} passenger${passengers === 1 ? "" : "s"} confirmed · ready to start`
            : "No passengers yet · accept at least one to start"}
        </Text>
      </View>

      {/* Primary CTA */}
      <Animated.View
        style={{
          transform: [{ scale: startable && !starting ? pulse : 1 }],
          shadowColor: startable ? COLORS.accent : "#000",
          shadowOffset: { width: 0, height: startable ? 6 : 2 },
          shadowOpacity: startable ? 0.35 : 0.12,
          shadowRadius: startable ? 12 : 4,
          elevation: startable ? 8 : 2,
        }}
      >
        <Pressable
          onPress={() => {
            if (!startable || starting) return;
            onStart(rideId);
          }}
          disabled={!startable || starting}
          style={({ pressed }) => ({
            borderRadius: 14,
            overflow: "hidden",
            opacity: !startable ? 0.55 : 1,
            transform: [{ scale: pressed && startable && !starting ? 0.97 : 1 }],
          })}
        >
          <LinearGradient
            colors={
              startable
                ? [COLORS.accent, "#16A34A"]
                : [COLORS.card, COLORS.cardAlt]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 13,
              borderWidth: startable ? 0 : 1,
              borderColor: COLORS.border,
            }}
          >
            {starting ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text
                  style={{
                    color: "white",
                    fontSize: 14.5,
                    fontWeight: "800",
                    letterSpacing: 0.3,
                  }}
                >
                  Starting…
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons
                  name="play-arrow"
                  size={20}
                  color={startable ? "white" : COLORS.textMuted}
                />
                <Text
                  style={{
                    color: startable ? "white" : COLORS.textMuted,
                    fontSize: 14.5,
                    fontWeight: "800",
                    letterSpacing: 0.3,
                  }}
                >
                  Start Ride
                </Text>
                {startable ? (
                  <View
                    style={{
                      marginLeft: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.22)",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 11,
                        fontWeight: "800",
                      }}
                    >
                      {passengers} ready
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function LiveSharingBanner({
  status,
  lastSentAt,
  error,
}: {
  status:
    | "idle"
    | "requesting-permission"
    | "permission-denied"
    | "tracking"
    | "error";
  lastSentAt: Date | null;
  error: string | null;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (status !== "tracking") {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [status, pulse]);

  const isError = status === "permission-denied" || status === "error";
  const label =
    status === "tracking"
      ? lastSentAt
        ? `Live · last ping ${lastSentAt.toLocaleTimeString("en-PK", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}`
        : "Live · syncing location…"
      : status === "requesting-permission"
        ? "Requesting location permission…"
        : status === "permission-denied"
          ? "Location permission denied"
          : status === "error"
            ? error ?? "Location tracker error"
            : "";

  const fg = isError ? "#F87171" : COLORS.accent;
  const bg = isError ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)";
  const border = isError ? "rgba(239,68,68,0.40)" : "rgba(34,197,94,0.40)";

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 10,
        padding: 10,
        borderRadius: 12,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Animated.View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: fg,
          opacity: pulse,
        }}
      />
      <MaterialIcons
        name={isError ? "gps-off" : "gps-fixed"}
        size={14}
        color={fg}
      />
      <Text
        style={{
          color: fg,
          fontSize: 12,
          fontWeight: "700",
          flex: 1,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
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
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: highlight ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
        borderWidth: 1,
        borderColor: highlight ? COLORS.accentEdge : "rgba(255,255,255,0.1)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <MaterialIcons
          name={icon}
          size={11}
          color={highlight ? COLORS.accent : COLORS.textDim}
        />
        <Text
          style={{
            color: highlight ? COLORS.accent : COLORS.textDim,
            fontSize: 9.5,
            fontWeight: "800",
            letterSpacing: 0.4,
          }}
        >
          {label.toUpperCase()}
        </Text>
      </View>
      <Text
        style={{
          color: highlight ? COLORS.accent : COLORS.textLight,
          fontSize: 16,
          fontWeight: "800",
          marginTop: 6,
          letterSpacing: -0.2,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
