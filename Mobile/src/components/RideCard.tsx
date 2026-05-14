import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "@/theme/colors";
import { fmtRideDateTime, hasDeparted } from "@/utils/datetime";
import type { Ride } from "@/types/ride";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const fmtPKR = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

type StatusMeta = {
  label: string;
  fg: string;
  bg: string;
  border: string;
  icon: IconName;
};

function statusMeta(status: string): StatusMeta {
  const s = (status ?? "").toLowerCase();
  if (s === "inprogress") {
    return {
      label: "In Progress",
      fg: "#60A5FA",
      bg: "rgba(59,130,246,0.18)",
      border: "rgba(59,130,246,0.50)",
      icon: "directions-car",
    };
  }
  if (s === "cancelled") {
    return {
      label: "Cancelled",
      fg: "#F87171",
      bg: "rgba(239,68,68,0.15)",
      border: "rgba(239,68,68,0.45)",
      icon: "cancel",
    };
  }
  return {
    label: "Available",
    fg: COLORS.accent,
    bg: COLORS.accentSoft,
    border: COLORS.accentEdge,
    icon: "check-circle",
  };
}

interface RideCardProps {
  ride: Ride;
  /** Current user's id, for the "can't book your own ride" check. */
  currentUserId?: string | number | null;
  /** True when the user hasn't finished onboarding (approval + location). */
  notReady?: boolean;
  /** Optional: reason copy if notReady (e.g. "Set location first"). */
  notReadyReason?: string;
  onPress: (ride: Ride) => void;
}

type LockReason =
  | "ok"
  | "rideFull"
  | "inProgress"
  | "departed"
  | "ownRide"
  | "notReady";

function resolveLock(
  ride: Ride,
  currentUserId: string | number | null | undefined,
  notReady: boolean
): LockReason {
  // Booking should be allowed ONLY when:
  //   availableSeats > 0, ride in future, user is not the driver.
  if (currentUserId != null && String(ride.driverId) === String(currentUserId))
    return "ownRide";
  if (ride.availableSeats <= 0) return "rideFull";
  if ((ride.status ?? "").toLowerCase() === "inprogress") return "inProgress";
  if (hasDeparted(ride.departureTime)) return "departed";
  if (notReady) return "notReady";
  return "ok";
}

export default function RideCard({
  ride,
  currentUserId,
  notReady,
  notReadyReason,
  onPress,
}: RideCardProps) {
  const { date, time } = fmtRideDateTime(ride.departureTime);
  const meta = statusMeta(ride.status);
  const seatsLeft = Math.max(0, ride.availableSeats);
  const lock = resolveLock(ride, currentUserId, !!notReady);
  const rideFull = lock === "rideFull";
  const inProgress = lock === "inProgress";
  const bookingDisabled = lock !== "ok";

  const vehicle = [ride.vehicleMake, ride.vehicleModel]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <Pressable
      onPress={() => onPress(ride)}
      android_ripple={{ color: "rgba(34,197,94,0.08)" }}
      style={({ pressed }) => ({
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
        elevation: 7,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <LinearGradient
        colors={[COLORS.card, COLORS.cardAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
      >
        {/* Top row: date/time + status */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialIcons name="event" size={14} color={COLORS.textMuted} />
            <Text
              style={{
                color: COLORS.textLight,
                fontSize: 12.5,
                fontWeight: "700",
              }}
            >
              {date}
            </Text>
            <Text style={{ color: COLORS.textDim, fontSize: 12 }}>·</Text>
            <Text
              style={{
                color: COLORS.textLight,
                fontSize: 12.5,
                fontWeight: "800",
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
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: meta.bg,
              borderWidth: 1,
              borderColor: meta.border,
            }}
          >
            <MaterialIcons name={meta.icon} size={11} color={meta.fg} />
            <Text
              style={{
                color: meta.fg,
                fontSize: 10.5,
                fontWeight: "800",
                letterSpacing: 0.3,
              }}
            >
              {meta.label.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Route */}
        <View style={{ marginTop: 12 }}>
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
              {ride.fromAddress}
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
              {ride.toAddress}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: COLORS.border,
            opacity: 0.6,
            marginVertical: 12,
          }}
        />

        {/* Driver + vehicle */}
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
              {ride.driverName || "Driver"}
            </Text>
            {vehicle ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 2,
                }}
              >
                <MaterialIcons
                  name="directions-car"
                  size={12}
                  color={COLORS.textMuted}
                />
                <Text
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                  numberOfLines={1}
                >
                  {vehicle}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bottom row: price, seats */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 14,
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: COLORS.textDim,
                fontSize: 10,
                fontWeight: "800",
                letterSpacing: 0.3,
              }}
            >
              PER SEAT
            </Text>
            <Text
              style={{
                color: COLORS.accent,
                fontSize: 17,
                fontWeight: "800",
                marginTop: 2,
              }}
            >
              {fmtPKR(ride.price)}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: rideFull
                ? "rgba(239,68,68,0.15)"
                : "rgba(0,0,0,0.22)",
              borderWidth: 1,
              borderColor: rideFull ? "rgba(239,68,68,0.45)" : COLORS.border,
            }}
          >
            <MaterialIcons
              name="event-seat"
              size={12}
              color={rideFull ? "#F87171" : COLORS.textLight}
            />
            <Text
              style={{
                color: rideFull ? "#F87171" : COLORS.textLight,
                fontSize: 11.5,
                fontWeight: "800",
              }}
            >
              {seatsLeft}/{ride.totalSeats}
            </Text>
          </View>
        </View>

        {/* CTA */}
        <View style={{ marginTop: 12 }}>
          {lock === "rideFull" ? (
            <CTAPill
              icon="block"
              label="Ride Full"
              fg="#F87171"
              bg="rgba(239,68,68,0.15)"
              border="rgba(239,68,68,0.45)"
            />
          ) : lock === "inProgress" ? (
            <CTAPill
              icon="lock-clock"
              label="In Progress · Booking Closed"
              fg="#60A5FA"
              bg="rgba(59,130,246,0.18)"
              border="rgba(59,130,246,0.50)"
            />
          ) : lock === "departed" ? (
            <CTAPill
              icon="history"
              label="Departed · Booking Closed"
              fg={COLORS.textMuted}
              bg="rgba(0,0,0,0.25)"
              border={COLORS.border}
            />
          ) : lock === "ownRide" ? (
            <CTAPill
              icon="drive-eta"
              label="Your ride"
              fg={COLORS.accent}
              bg={COLORS.accentSoft}
              border={COLORS.accentEdge}
            />
          ) : lock === "notReady" ? (
            <CTAPill
              icon="lock"
              label={notReadyReason ?? "Finish setup to book"}
              fg={COLORS.amber}
              bg="rgba(245,158,11,0.12)"
              border="rgba(245,158,11,0.45)"
            />
          ) : (
            <View
              style={{
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={[COLORS.accent, "#16A34A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 12,
                }}
              >
                <MaterialIcons name="directions-car" size={15} color="white" />
                <Text
                  style={{
                    color: "white",
                    fontSize: 13,
                    fontWeight: "800",
                    letterSpacing: 0.2,
                  }}
                >
                  Book this ride
                </Text>
              </LinearGradient>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function CTAPill({
  icon,
  label,
  fg,
  bg,
  border,
}: {
  icon: IconName;
  label: string;
  fg: string;
  bg: string;
  border: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <MaterialIcons name={icon} size={15} color={fg} />
      <Text
        style={{
          color: fg,
          fontSize: 13,
          fontWeight: "800",
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
