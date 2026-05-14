import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  listMyPassengerBookings,
  type PassengerBookingDto,
  type PassengerBookingStatus,
} from "@/api/api";
import { COLORS } from "@/theme/colors";
import { fmtRideDateTime } from "@/utils/datetime";
import type { PassengerStackParamList } from "@/navigation/PassengerStack";

type Nav = NativeStackNavigationProp<PassengerStackParamList>;

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];
type FilterTab = "All" | "Pending" | "Accepted" | "Completed";

const TABS: FilterTab[] = ["All", "Pending", "Accepted", "Completed"];

const fmtPKR = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

type StatusMeta = {
  label: string;
  fg: string;
  bg: string;
  border: string;
  icon: IconName;
};

function statusMeta(status: PassengerBookingStatus): StatusMeta {
  switch (status) {
    case "Accepted":
      return {
        label: "Accepted",
        fg: COLORS.accent,
        bg: COLORS.accentSoft,
        border: COLORS.accentEdge,
        icon: "check-circle",
      };
    case "Rejected":
      return {
        label: "Rejected",
        fg: "#F87171",
        bg: "rgba(239,68,68,0.15)",
        border: "rgba(239,68,68,0.45)",
        icon: "cancel",
      };
    case "Cancelled":
      return {
        label: "Cancelled",
        fg: "#CBD5E1",
        bg: "rgba(148,163,184,0.15)",
        border: "rgba(148,163,184,0.45)",
        icon: "do-not-disturb-on",
      };
    case "Completed":
      return {
        label: "Completed",
        fg: "#60A5FA",
        bg: "rgba(59,130,246,0.18)",
        border: "rgba(59,130,246,0.50)",
        icon: "verified",
      };
    case "Pending":
    default:
      return {
        label: "Pending",
        fg: COLORS.amber,
        bg: "rgba(245,158,11,0.15)",
        border: "rgba(245,158,11,0.45)",
        icon: "schedule",
      };
  }
}

export default function PassengerMyBookings() {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<PassengerBookingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<FilterTab>("All");

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const list = await listMyPassengerBookings();
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

  const filtered = useMemo(() => {
    if (tab === "All") return bookings;
    return bookings.filter((b) => b.status === tab);
  }, [bookings, tab]);

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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "white",
                fontSize: 22,
                fontWeight: "800",
                letterSpacing: -0.3,
              }}
            >
              My Bookings
            </Text>
            <Text
              style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}
            >
              Track your ride requests
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
              {bookings.length} booking{bookings.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        {/* TABS */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          {TABS.map((t) => {
            const active = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 9,
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
                <Text
                  style={{
                    color: active ? "white" : COLORS.textMuted,
                    fontSize: 11.5,
                    fontWeight: "800",
                    letterSpacing: 0.2,
                  }}
                >
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      {/* LIST */}
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
      ) : (
        <FlatList<PassengerBookingDto>
          data={filtered}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 110,
            gap: 12,
            flexGrow: 1,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
          ListEmptyComponent={
            error ? (
              <ErrorCard error={error} onRetry={() => load("initial")} />
            ) : (
              <EmptyState tab={tab} />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load("refresh")}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
          renderItem={({ item }) => <BookingRow booking={item} />}
        />
      )}
    </View>
  );
}

function BookingRow({ booking }: { booking: PassengerBookingDto }) {
  const navigation = useNavigation<Nav>();
  const rideInProgress = booking.ride.status === "InProgress";
  const trackable = booking.status === "Accepted" && rideInProgress;

  const meta = statusMeta(booking.status);
  const { date, time } = fmtRideDateTime(booking.ride.departureTime);
  const phone = booking.driver.phoneNumber?.trim();

  const callDriver = () => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

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
        {/* Top row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 11,
                fontWeight: "700",
              }}
            >
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

        {/* Route */}
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
              {booking.ride.fromAddress}
            </Text>
          </View>
          <View
            style={{
              width: 1,
              height: 12,
              backgroundColor: COLORS.border,
              marginLeft: 6,
              marginVertical: 2,
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
              {booking.ride.toAddress}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: COLORS.border,
            opacity: 0.6,
            marginVertical: 14,
          }}
        />

        {/* Driver + call */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: COLORS.accentSoft,
              borderWidth: 1,
              borderColor: COLORS.accentEdge,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="person" size={18} color={COLORS.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: COLORS.textLight,
                fontSize: 14,
                fontWeight: "800",
              }}
              numberOfLines={1}
            >
              {booking.driver.fullName || "Driver"}
            </Text>
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 12,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {phone ?? "No phone number"}
            </Text>
          </View>
          {phone ? (
            <Pressable
              onPress={callDriver}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(34,197,94,0.14)",
                borderWidth: 1,
                borderColor: COLORS.accentEdge,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              })}
            >
              <MaterialIcons name="call" size={16} color={COLORS.accent} />
            </Pressable>
          ) : null}
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          <StatBox
            icon="event-seat"
            label="Seats"
            value={`${booking.seatsBooked}`}
          />
          <StatBox
            icon="sell"
            label="Per Seat"
            value={fmtPKR(booking.ride.price)}
          />
          <StatBox
            icon="payments"
            label="Total"
            value={fmtPKR(booking.totalPrice)}
            highlight
          />
        </View>

        {/* Stops */}
        <View
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            backgroundColor: "rgba(0,0,0,0.22)",
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: COLORS.textDim,
                  fontSize: 10,
                  fontWeight: "800",
                  letterSpacing: 0.3,
                }}
              >
                PICKUP
              </Text>
              <Text
                style={{
                  color: COLORS.textLight,
                  fontSize: 12.5,
                  fontWeight: "700",
                  marginTop: 3,
                }}
                numberOfLines={2}
              >
                {booking.pickupStop || "—"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: COLORS.textDim,
                  fontSize: 10,
                  fontWeight: "800",
                  letterSpacing: 0.3,
                }}
              >
                DROPOFF
              </Text>
              <Text
                style={{
                  color: COLORS.textLight,
                  fontSize: 12.5,
                  fontWeight: "700",
                  marginTop: 3,
                }}
                numberOfLines={2}
              >
                {booking.dropoffStop || "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Live-tracking CTA — visible only for Accepted bookings whose ride
            has been started by the driver. */}
        {trackable ? (
          <Pressable
            onPress={() =>
              navigation.navigate("RideTracking", {
                rideId: booking.rideId,
                from: booking.ride.fromAddress,
                to: booking.ride.toAddress,
                driverName: booking.driver.fullName,
              })
            }
            style={({ pressed }) => ({
              marginTop: 14,
              borderRadius: 12,
              overflow: "hidden",
              transform: [{ scale: pressed ? 0.98 : 1 }],
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
                paddingVertical: 12,
              }}
            >
              <MaterialIcons name="my-location" size={16} color="white" />
              <Text
                style={{
                  color: "white",
                  fontSize: 14,
                  fontWeight: "800",
                  letterSpacing: 0.3,
                }}
              >
                Track driver live
              </Text>
            </LinearGradient>
          </Pressable>
        ) : booking.status === "Accepted" ? (
          <View
            style={{
              marginTop: 14,
              padding: 10,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(245,158,11,0.12)",
              borderWidth: 1,
              borderColor: "rgba(245,158,11,0.40)",
            }}
          >
            <MaterialIcons name="hourglass-empty" size={14} color={COLORS.amber} />
            <Text
              style={{ color: COLORS.amber, fontSize: 12, fontWeight: "700" }}
            >
              Waiting for driver to start the ride
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
  icon: IconName;
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

function EmptyState({ tab }: { tab: FilterTab }) {
  const copy =
    tab === "All"
      ? {
          title: "No bookings yet",
          sub: "Your ride bookings will appear here.",
        }
      : {
          title: `No ${tab.toLowerCase()} bookings`,
          sub: "Nothing in this bucket right now.",
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
        marginTop: 12,
      }}
    >
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: 34,
          backgroundColor: COLORS.accentSoft,
          borderWidth: 1,
          borderColor: COLORS.accentEdge,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <MaterialIcons name="inbox" size={32} color={COLORS.accent} />
      </View>
      <Text
        style={{
          color: COLORS.textLight,
          fontSize: 17,
          fontWeight: "800",
          letterSpacing: -0.2,
        }}
      >
        {copy.title}
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
        {copy.sub}
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
        backgroundColor: COLORS.dangerBg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.dangerBorder,
        padding: 14,
        marginTop: 12,
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
            fontWeight: "800",
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
          <Text style={{ color: "white", fontSize: 12, fontWeight: "800" }}>
            Try again
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
