import { useCallback, useMemo, useState } from "react";
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
import {
  acceptDriverBooking,
  listDriverBookings,
  rejectDriverBooking,
  type DriverBookingDto,
} from "@/api/api";
import { useAuth } from "@/auth/AuthContext";
import { COLORS } from "@/theme/colors";
import BookingCard from "@/components/BookingCard";
import type { DriverStackParamList } from "@/navigation/DriverStack";

type Nav = NativeStackNavigationProp<DriverStackParamList, "Bookings">;
type FilterTab = "Pending" | "Accepted" | "Rejected";

const TABS: {
  key: FilterTab;
  label: string;
  dot: string;
  dotBg: string;
  activeFg: string;
}[] = [
  {
    key: "Pending",
    label: "Pending",
    dot: "#F59E0B",
    dotBg: "rgba(245,158,11,0.18)",
    activeFg: "#F59E0B",
  },
  {
    key: "Accepted",
    label: "Accepted",
    dot: "#22C55E",
    dotBg: "rgba(34,197,94,0.18)",
    activeFg: "#22C55E",
  },
  {
    key: "Rejected",
    label: "Rejected",
    dot: "#F87171",
    dotBg: "rgba(239,68,68,0.18)",
    activeFg: "#F87171",
  },
];

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const isApproved = user?.status === "Approved";

  const [bookings, setBookings] = useState<DriverBookingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<FilterTab>("Pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const list = await listDriverBookings();
        setBookings(list);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ??
          err?.message ??
          "Could not load bookings.";
        setError(typeof msg === "string" ? msg : "Could not load bookings.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      load("initial");
    }, [load])
  );

  const counts = useMemo(() => {
    const c = { Pending: 0, Accepted: 0, Rejected: 0 };
    for (const b of bookings) {
      if (b.status === "Pending") c.Pending++;
      else if (b.status === "Accepted") c.Accepted++;
      else if (b.status === "Rejected") c.Rejected++;
    }
    return c;
  }, [bookings]);

  const filtered = useMemo(
    () => bookings.filter((b) => b.status === tab),
    [bookings, tab]
  );

  const handleAccept = useCallback(
    async (id: string) => {
      if (busyId) return;
      setBusyId(id);
      try {
        await acceptDriverBooking(id);
        await load("refresh");
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ??
          err?.response?.data ??
          err?.message ??
          "Could not accept booking.";
        Alert.alert(
          "Accept failed",
          typeof msg === "string" ? msg : "Could not accept booking."
        );
      } finally {
        setBusyId(null);
      }
    },
    [busyId, load]
  );

  const handleReject = useCallback(
    (id: string) => {
      if (busyId) return;
      Alert.alert(
        "Reject booking?",
        "The passenger will be notified and the seats will be released.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reject",
            style: "destructive",
            onPress: async () => {
              setBusyId(id);
              try {
                await rejectDriverBooking(id);
                await load("refresh");
              } catch (err: any) {
                const msg =
                  err?.response?.data?.message ??
                  err?.response?.data ??
                  err?.message ??
                  "Could not reject booking.";
                Alert.alert(
                  "Reject failed",
                  typeof msg === "string"
                    ? msg
                    : "Could not reject booking."
                );
              } finally {
                setBusyId(null);
              }
            },
          },
        ]
      );
    },
    [busyId, load]
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
              Bookings
            </Text>
            <Text
              style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}
            >
              Manage ride requests
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
              {bookings.length} request{bookings.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        {/* FILTER TABS */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginTop: 18,
          }}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            const count = counts[t.key];
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: active
                    ? "rgba(255,255,255,0.16)"
                    : "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: active
                    ? "rgba(255,255,255,0.28)"
                    : "rgba(255,255,255,0.10)",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Text
                    style={{
                      color: active ? "white" : COLORS.textMuted,
                      fontSize: 12.5,
                      fontWeight: "800",
                      letterSpacing: 0.2,
                    }}
                  >
                    {t.label}
                  </Text>
                  <View
                    style={{
                      minWidth: 20,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 999,
                      backgroundColor: t.dotBg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: t.dot,
                        fontSize: 10,
                        fontWeight: "800",
                      }}
                    >
                      {count}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      {/* BODY */}
      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text
            style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 10 }}
          >
            Loading bookings…
          </Text>
        </View>
      ) : error ? (
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 24,
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
          <ErrorCard error={error} onRetry={() => load("initial")} />
        </ScrollView>
      ) : filtered.length === 0 ? (
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
          <EmptyState tab={tab} />
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
          {filtered.map((b, i) => (
            <BookingCard
              key={b.id}
              booking={b}
              index={i}
              isApproved={isApproved}
              busyId={busyId}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function EmptyState({ tab }: { tab: FilterTab }) {
  const copy: Record<FilterTab, { title: string; sub: string }> = {
    Pending: {
      title: "No pending requests",
      sub: "Booking requests will appear here",
    },
    Accepted: {
      title: "No accepted bookings",
      sub: "Confirmed bookings will show up here",
    },
    Rejected: {
      title: "No rejected bookings",
      sub: "You haven't rejected any requests yet",
    },
  };
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
        <MaterialIcons name="inbox" size={36} color={COLORS.accent} />
      </View>
      <Text
        style={{
          color: COLORS.textLight,
          fontSize: 18,
          fontWeight: "800",
          letterSpacing: -0.3,
        }}
      >
        {copy[tab].title}
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
        {copy[tab].sub}
      </Text>
    </View>
  );
}

function ErrorCard({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
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
        <Text
          style={{
            color: COLORS.dangerText,
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          Couldn't load bookings
        </Text>
        <Text
          style={{ color: COLORS.dangerText, fontSize: 12, marginTop: 4 }}
        >
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
