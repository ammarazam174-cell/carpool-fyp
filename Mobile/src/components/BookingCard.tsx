import { useEffect, useRef } from "react";
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "@/theme/colors";
import { fmtRideDateTime } from "@/utils/datetime";
import type { DriverBookingDto, DriverBookingStatus } from "@/api/api";

type StatusMeta = {
  label: string;
  bg: string;
  border: string;
  fg: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
};

function statusMeta(status: DriverBookingStatus): StatusMeta {
  switch (status) {
    case "Accepted":
      return {
        label: "Accepted",
        bg: "rgba(34,197,94,0.15)",
        border: "rgba(34,197,94,0.45)",
        fg: "#22C55E",
        icon: "check-circle",
      };
    case "Rejected":
      return {
        label: "Rejected",
        bg: "rgba(239,68,68,0.15)",
        border: "rgba(239,68,68,0.45)",
        fg: "#F87171",
        icon: "cancel",
      };
    case "Cancelled":
      return {
        label: "Cancelled",
        bg: "rgba(148,163,184,0.15)",
        border: "rgba(148,163,184,0.45)",
        fg: "#CBD5E1",
        icon: "do-not-disturb-on",
      };
    case "Completed":
      return {
        label: "Completed",
        bg: "rgba(59,130,246,0.18)",
        border: "rgba(59,130,246,0.50)",
        fg: "#60A5FA",
        icon: "verified",
      };
    case "Pending":
    default:
      return {
        label: "Pending",
        bg: "rgba(245,158,11,0.15)",
        border: "rgba(245,158,11,0.45)",
        fg: "#F59E0B",
        icon: "schedule",
      };
  }
}

const fmtPKR = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface BookingCardProps {
  booking: DriverBookingDto;
  index: number;
  isApproved: boolean;
  busyId: string | null;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export default function BookingCard({
  booking,
  index,
  isApproved,
  busyId,
  onAccept,
  onReject,
}: BookingCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay: index * 70,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        delay: index * 70,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  const meta = statusMeta(booking.status);
  const { date, time } = fmtRideDateTime(booking.ride.departureTime);
  const filled = Math.max(
    0,
    booking.rideTotalSeats - booking.rideAvailableSeats
  );
  const totalSeats = booking.rideTotalSeats || 0;
  const pct = totalSeats > 0 ? Math.min(100, (filled / totalSeats) * 100) : 0;
  const seatsLeft = Math.max(0, booking.rideAvailableSeats);
  const isPending = booking.status === "Pending";
  const isBusy = busyId === booking.id;

  const showUnderReviewAlert = () => {
    Alert.alert(
      "Your profile is under review",
      "You cannot manage bookings yet."
    );
  };

  const openInMaps = () => {
    if (
      booking.passengerLatitude != null &&
      booking.passengerLongitude != null
    ) {
      const lat = booking.passengerLatitude;
      const lng = booking.passengerLongitude;
      const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      Linking.openURL(url).catch(() => {
        Alert.alert("Unable to open Maps");
      });
    } else {
      Alert.alert("Location unavailable", "Passenger didn't share coordinates.");
    }
  };

  const callPassenger = () => {
    const phone = booking.passenger.phoneNumber?.trim();
    if (!phone) {
      Alert.alert("No phone number", "Passenger didn't share a phone number.");
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert("Unable to place call");
    });
  };

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
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
        {/* Top row: date/time + status */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text
              style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: "700" }}
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
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
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
              {booking.ride.fromAddress}
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
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
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

        {/* Passenger */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: COLORS.accentSoft,
              borderWidth: 1,
              borderColor: COLORS.accentEdge,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{ color: COLORS.accent, fontSize: 16, fontWeight: "800" }}
            >
              {initialsFrom(booking.passenger.fullName)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: COLORS.textLight,
                fontSize: 15,
                fontWeight: "800",
              }}
              numberOfLines={1}
            >
              {booking.passenger.fullName}
            </Text>
            <Text
              style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}
              numberOfLines={1}
            >
              {booking.passenger.phoneNumber ?? "No phone number"}
            </Text>
          </View>
          <Pressable
            onPress={callPassenger}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(34,197,94,0.12)",
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
        </View>

        {/* Booking details */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          <DetailBox
            icon="event-seat"
            label="Seats"
            value={`${booking.seatsBooked}`}
          />
          <DetailBox
            icon="sell"
            label="Per Seat"
            value={fmtPKR(booking.pricePerSeat)}
          />
          <DetailBox
            icon="payments"
            label="Total"
            value={fmtPKR(booking.totalPrice)}
            highlight
          />
        </View>

        {/* Seat progress bar */}
        <View style={{ marginTop: 14 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <Text
              style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: "700" }}
            >
              SEATS FILLED · {filled}/{totalSeats}
            </Text>
            <Text
              style={{
                color: seatsLeft === 0 ? "#F87171" : COLORS.textDim,
                fontSize: 11,
                fontWeight: "800",
              }}
            >
              {seatsLeft === 0
                ? "Fully booked"
                : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`}
            </Text>
          </View>
          <View
            style={{
              height: 8,
              borderRadius: 999,
              backgroundColor: "rgba(0,0,0,0.28)",
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={[COLORS.accent, "#16A34A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                height: "100%",
                width: `${pct}%`,
              }}
            />
          </View>
        </View>

        {/* Pickup location */}
        <View
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            backgroundColor: "rgba(0,0,0,0.22)",
            borderWidth: 1,
            borderColor: COLORS.border,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <MaterialIcons name="my-location" size={16} color={COLORS.accent} />
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
                fontSize: 13,
                fontWeight: "700",
                marginTop: 2,
              }}
              numberOfLines={2}
            >
              {booking.passengerAddress ?? booking.pickupStop ?? "Not specified"}
            </Text>
          </View>
          <Pressable
            onPress={openInMaps}
            hitSlop={8}
            style={({ pressed }) => ({
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: "rgba(34,197,94,0.14)",
              borderWidth: 1,
              borderColor: COLORS.accentEdge,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              opacity: pressed ? 0.6 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <MaterialIcons name="map" size={12} color={COLORS.accent} />
            <Text
              style={{ color: COLORS.accent, fontSize: 11, fontWeight: "800" }}
            >
              Map
            </Text>
          </Pressable>
        </View>

        {/* Actions */}
        {isPending ? (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <ActionPillButton
              tone="reject"
              disabled={isBusy}
              onPress={() => {
                if (!isApproved) {
                  showUnderReviewAlert();
                  return;
                }
                onReject(booking.id);
              }}
            >
              Reject
            </ActionPillButton>
            <ActionPillButton
              tone="accept"
              disabled={isBusy}
              onPress={() => {
                if (!isApproved) {
                  showUnderReviewAlert();
                  return;
                }
                onAccept(booking.id);
              }}
            >
              {isBusy ? "Working…" : "Accept"}
            </ActionPillButton>
          </View>
        ) : booking.status === "Accepted" ? (
          <FooterBadge
            color={COLORS.accent}
            icon="check-circle"
            text="Booking accepted · Passenger confirmed"
            bg="rgba(34,197,94,0.12)"
            border="rgba(34,197,94,0.40)"
          />
        ) : booking.status === "Rejected" ? (
          <FooterBadge
            color="#F87171"
            icon="cancel"
            text="Booking rejected"
            bg="rgba(239,68,68,0.12)"
            border="rgba(239,68,68,0.40)"
          />
        ) : booking.status === "Completed" ? (
          <FooterBadge
            color="#60A5FA"
            icon="verified"
            text="Ride completed"
            bg="rgba(59,130,246,0.12)"
            border="rgba(59,130,246,0.40)"
          />
        ) : booking.status === "Cancelled" ? (
          <FooterBadge
            color="#CBD5E1"
            icon="do-not-disturb-on"
            text="Passenger cancelled"
            bg="rgba(148,163,184,0.10)"
            border="rgba(148,163,184,0.40)"
          />
        ) : null}

        {isPending && !isApproved ? (
          <Text
            style={{
              color: COLORS.amber,
              fontSize: 11,
              fontWeight: "700",
              marginTop: 10,
              textAlign: "center",
            }}
          >
            Profile under review · approval required to manage bookings
          </Text>
        ) : null}
      </LinearGradient>
    </Animated.View>
  );
}

function DetailBox({
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

function ActionPillButton({
  tone,
  disabled,
  onPress,
  children,
}: {
  tone: "accept" | "reject";
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const isAccept = tone === "accept";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: 12,
        overflow: "hidden",
        opacity: disabled ? 0.6 : 1,
        transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
      })}
    >
      <LinearGradient
        colors={
          isAccept
            ? [COLORS.accent, "#16A34A"]
            : ["#EF4444", "#B91C1C"]
        }
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
        <MaterialIcons
          name={isAccept ? "check" : "close"}
          size={16}
          color="white"
        />
        <Text
          style={{
            color: "white",
            fontSize: 14,
            fontWeight: "800",
            letterSpacing: 0.2,
          }}
        >
          {children}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

function FooterBadge({
  color,
  icon,
  text,
  bg,
  border,
}: {
  color: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  text: string;
  bg: string;
  border: string;
}) {
  return (
    <View
      style={{
        marginTop: 14,
        padding: 10,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <MaterialIcons name={icon} size={14} color={color} />
      <Text style={{ color, fontSize: 12, fontWeight: "800" }}>{text}</Text>
    </View>
  );
}
