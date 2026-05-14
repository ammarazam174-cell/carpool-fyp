import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { createBooking } from "@/api/api";
import { useAuth } from "@/auth/AuthContext";
import { COLORS } from "@/theme/colors";
import { fmtRideDateTime, hasDeparted } from "@/utils/datetime";
import type { PassengerStackParamList } from "@/navigation/PassengerStack";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];
type Nav = NativeStackNavigationProp<PassengerStackParamList, "RideDetail">;
type RouteT = RouteProp<PassengerStackParamList, "RideDetail">;

const fmtPKR = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

export default function RideDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { ride, location } = useRoute<RouteT>().params;
  const { user } = useAuth();
  const isApproved = user?.status === "Approved";

  const { date, time } = fmtRideDateTime(ride.departureTime);
  const vehicle = [ride.vehicleMake, ride.vehicleModel]
    .filter(Boolean)
    .join(" ")
    .trim();
  const rideFull = ride.availableSeats <= 0;
  const inProgress = (ride.status ?? "").toLowerCase() === "inprogress";
  const departed = hasDeparted(ride.departureTime);
  const isOwnRide =
    user?.id != null && String(ride.driverId) === String(user.id);
  const bookingBlocked =
    !isApproved || rideFull || inProgress || departed || isOwnRide;

  const pickupOptions = useMemo<string[]>(() => {
    const stops = ride.pickupStops?.filter(Boolean) ?? [];
    return stops.length > 0 ? stops : [ride.fromAddress];
  }, [ride.pickupStops, ride.fromAddress]);

  const dropoffOptions = useMemo<string[]>(() => {
    const stops = ride.dropoffStops?.filter(Boolean) ?? [];
    return stops.length > 0 ? stops : [ride.toAddress];
  }, [ride.dropoffStops, ride.toAddress]);

  const [pickup, setPickup] = useState<string>(pickupOptions[0] ?? "");
  const [dropoff, setDropoff] = useState<string>(dropoffOptions[0] ?? "");
  const [seats, setSeats] = useState(1);
  const [openPicker, setOpenPicker] = useState<"pickup" | "dropoff" | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  const maxSeats = Math.max(1, ride.availableSeats);
  const total = seats * ride.price;

  const incSeats = () => setSeats((s) => Math.min(maxSeats, s + 1));
  const decSeats = () => setSeats((s) => Math.max(1, s - 1));

  const handleBook = async () => {
    if (isOwnRide) {
      Alert.alert("Your ride", "You can't book your own ride.");
      return;
    }
    if (departed) {
      Alert.alert(
        "Ride departed",
        "This ride has already started and can no longer be booked."
      );
      return;
    }
    if (!isApproved) {
      Alert.alert(
        "Profile under review",
        "Your profile is under review. Please wait for admin approval."
      );
      return;
    }
    if (rideFull) {
      Alert.alert("Ride full", "All seats on this ride are already booked.");
      return;
    }
    if (inProgress) {
      Alert.alert(
        "Ride in progress",
        "This ride has already started and is no longer accepting bookings."
      );
      return;
    }
    if (!pickup || !dropoff) {
      Alert.alert("Select locations", "Pick pickup and dropoff points first.");
      return;
    }

    setSubmitting(true);
    try {
      await createBooking({
        rideId: ride.id,
        seats,
        pickupStop: pickup,
        dropoffStop: dropoff,
        passengerLatitude: location.latitude,
        passengerLongitude: location.longitude,
        passengerAddress: location.address,
      });
      Alert.alert(
        "Booking requested",
        `Your request for ${seats} seat${seats === 1 ? "" : "s"} has been sent to the driver.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data ??
        err?.message ??
        "Could not complete booking.";
      Alert.alert(
        "Booking failed",
        typeof msg === "string" ? msg : "Could not complete booking."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* HEADER */}
      <LinearGradient
        colors={[COLORS.primaryMid, COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 22,
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
              style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: "700" }}
            >
              RIDE DETAILS
            </Text>
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "800",
                letterSpacing: -0.2,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {ride.fromAddress} → {ride.toAddress}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 140,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* RIDE INFO CARD */}
        <SectionCard title="Ride Info" icon="info">
          <InfoRow
            icon="event"
            label="Date"
            value={date}
          />
          <InfoRow icon="schedule" label="Time" value={time} />
          <InfoRow
            icon="person"
            label="Driver"
            value={ride.driverName || "Driver"}
          />
          <InfoRow
            icon="directions-car"
            label="Vehicle"
            value={vehicle || "—"}
          />
          <InfoRow
            icon="sell"
            label="Price per seat"
            value={fmtPKR(ride.price)}
            highlight
          />
          <InfoRow
            icon="event-seat"
            label="Seats available"
            value={`${Math.max(0, ride.availableSeats)}/${ride.totalSeats}`}
            tone={rideFull ? "danger" : "default"}
            isLast
          />
        </SectionCard>

        {/* ADMIN APPROVAL WARNING */}
        {!isApproved ? (
          <WarningBanner
            title="Profile under review"
            text="You can view rides, but booking is disabled until admin approval."
          />
        ) : null}

        {/* RIDE FULL / IN PROGRESS BANNER */}
        {rideFull ? (
          <WarningBanner
            title="Ride full"
            text="All seats on this ride are already booked."
            tone="danger"
          />
        ) : inProgress ? (
          <WarningBanner
            title="Ride already started"
            text="Booking is closed for in-progress rides."
            tone="info"
          />
        ) : null}

        {/* LOCATION SELECTION */}
        <SectionCard title="Your Stops" icon="location-on">
          <DropdownField
            label="Pickup Location"
            icon="trip-origin"
            iconColor={COLORS.accent}
            value={pickup}
            placeholder="Select pickup"
            onPress={() => setOpenPicker("pickup")}
            disabled={bookingBlocked}
          />
          <View style={{ height: 10 }} />
          <DropdownField
            label="Dropoff Location"
            icon="place"
            iconColor="#F87171"
            value={dropoff}
            placeholder="Select dropoff"
            onPress={() => setOpenPicker("dropoff")}
            disabled={bookingBlocked}
          />
        </SectionCard>

        {/* SEAT SELECTION */}
        <SectionCard title="Seats" icon="event-seat">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 4,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: COLORS.textDim,
                  fontSize: 10.5,
                  fontWeight: "800",
                  letterSpacing: 0.3,
                }}
              >
                NUMBER OF SEATS
              </Text>
              <Text
                style={{
                  color: COLORS.textLight,
                  fontSize: 14,
                  fontWeight: "700",
                  marginTop: 2,
                }}
              >
                Max {maxSeats} available
              </Text>
            </View>
            <Stepper
              value={seats}
              onDec={decSeats}
              onInc={incSeats}
              disableDec={seats <= 1 || bookingBlocked}
              disableInc={seats >= maxSeats || bookingBlocked}
            />
          </View>
        </SectionCard>

        {/* TOTAL */}
        <View
          style={{
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: COLORS.accentEdge,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.28,
            shadowRadius: 14,
            elevation: 7,
          }}
        >
          <LinearGradient
            colors={["rgba(34,197,94,0.18)", "rgba(34,197,94,0.08)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: COLORS.accent,
                  fontSize: 11,
                  fontWeight: "800",
                  letterSpacing: 0.3,
                }}
              >
                TOTAL FARE
              </Text>
              <Text
                style={{
                  color: COLORS.textMuted,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {seats} seat{seats === 1 ? "" : "s"} × {fmtPKR(ride.price)}
              </Text>
            </View>
            <Text
              style={{
                color: COLORS.accent,
                fontSize: 24,
                fontWeight: "800",
                letterSpacing: -0.5,
              }}
            >
              {fmtPKR(total)}
            </Text>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* BOOK BUTTON */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: 16,
          paddingBottom: insets.bottom + 16,
          backgroundColor: COLORS.bg,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        }}
      >
        <Pressable
          onPress={handleBook}
          disabled={bookingBlocked || submitting}
          style={({ pressed }) => ({
            borderRadius: 14,
            overflow: "hidden",
            opacity: bookingBlocked || submitting ? 0.55 : 1,
            transform: [
              {
                scale: pressed && !bookingBlocked && !submitting ? 0.98 : 1,
              },
            ],
          })}
        >
          <LinearGradient
            colors={
              bookingBlocked
                ? [COLORS.card, COLORS.cardAlt]
                : [COLORS.accent, "#16A34A"]
            }
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
            <MaterialIcons
              name={
                isOwnRide
                  ? "drive-eta"
                  : rideFull
                    ? "block"
                    : departed
                      ? "history"
                      : bookingBlocked
                        ? "lock"
                        : "directions-car"
              }
              size={18}
              color="white"
            />
            <Text
              style={{
                color: "white",
                fontSize: 15,
                fontWeight: "800",
                letterSpacing: 0.3,
              }}
            >
              {submitting
                ? "Booking…"
                : isOwnRide
                  ? "Your Ride"
                  : rideFull
                    ? "Ride Full"
                    : departed
                      ? "Ride Departed"
                      : inProgress
                        ? "Booking Closed"
                        : !isApproved
                          ? "Awaiting Approval"
                          : "Book Ride"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* STOP PICKER MODAL */}
      <StopPicker
        visible={openPicker !== null}
        title={
          openPicker === "pickup"
            ? "Select pickup location"
            : "Select dropoff location"
        }
        options={openPicker === "pickup" ? pickupOptions : dropoffOptions}
        selected={openPicker === "pickup" ? pickup : dropoff}
        onClose={() => setOpenPicker(null)}
        onPick={(v) => {
          if (openPicker === "pickup") setPickup(v);
          else if (openPicker === "dropoff") setDropoff(v);
          setOpenPicker(null);
        }}
      />
    </View>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: IconName;
  children: React.ReactNode;
}) {
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: COLORS.accentSoft,
              borderWidth: 1,
              borderColor: COLORS.accentEdge,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name={icon} size={16} color={COLORS.accent} />
          </View>
          <Text
            style={{
              color: COLORS.textLight,
              fontSize: 15,
              fontWeight: "800",
              letterSpacing: -0.2,
            }}
          >
            {title}
          </Text>
        </View>
        {children}
      </LinearGradient>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  highlight,
  tone,
  isLast,
}: {
  icon: IconName;
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "default" | "danger";
  isLast?: boolean;
}) {
  const valueColor =
    tone === "danger"
      ? "#F87171"
      : highlight
        ? COLORS.accent
        : COLORS.textLight;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "rgba(4,120,87,0.35)",
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: "rgba(0,0,0,0.22)",
          borderWidth: 1,
          borderColor: COLORS.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name={icon} size={14} color={COLORS.textDim} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: COLORS.textDim,
            fontSize: 10.5,
            fontWeight: "800",
            letterSpacing: 0.3,
          }}
        >
          {label.toUpperCase()}
        </Text>
        <Text
          style={{
            color: valueColor,
            fontSize: 14,
            fontWeight: "800",
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function DropdownField({
  label,
  icon,
  iconColor,
  value,
  placeholder,
  onPress,
  disabled,
}: {
  label: string;
  icon: IconName;
  iconColor: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const empty = !value;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: "rgba(0,0,0,0.22)",
        borderWidth: 1,
        borderColor: COLORS.border,
        opacity: disabled ? 0.6 : pressed ? 0.75 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <MaterialIcons name={icon} size={12} color={iconColor} />
        <Text
          style={{
            color: COLORS.textDim,
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 0.3,
          }}
        >
          {label.toUpperCase()}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <Text
          style={{
            color: empty ? COLORS.textMuted : COLORS.textLight,
            fontSize: 14,
            fontWeight: empty ? "600" : "800",
            flex: 1,
            paddingRight: 8,
          }}
          numberOfLines={1}
        >
          {empty ? placeholder : value}
        </Text>
        <MaterialIcons
          name="arrow-drop-down"
          size={20}
          color={COLORS.textMuted}
        />
      </View>
    </Pressable>
  );
}

function Stepper({
  value,
  onDec,
  onInc,
  disableDec,
  disableInc,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  disableDec?: boolean;
  disableInc?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 6,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "rgba(0,0,0,0.25)",
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <StepperButton icon="remove" onPress={onDec} disabled={disableDec} />
      <Text
        style={{
          color: COLORS.textLight,
          fontSize: 18,
          fontWeight: "800",
          minWidth: 24,
          textAlign: "center",
        }}
      >
        {value}
      </Text>
      <StepperButton icon="add" onPress={onInc} disabled={disableInc} />
    </View>
  );
}

function StepperButton({
  icon,
  onPress,
  disabled,
}: {
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: disabled
          ? "rgba(255,255,255,0.05)"
          : COLORS.accentSoft,
        borderWidth: 1,
        borderColor: disabled ? COLORS.border : COLORS.accentEdge,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : pressed ? 0.65 : 1,
        transform: [{ scale: pressed && !disabled ? 0.92 : 1 }],
      })}
    >
      <MaterialIcons
        name={icon}
        size={18}
        color={disabled ? COLORS.textMuted : COLORS.accent}
      />
    </Pressable>
  );
}

function WarningBanner({
  title,
  text,
  tone = "warn",
}: {
  title: string;
  text: string;
  tone?: "warn" | "danger" | "info";
}) {
  const palette =
    tone === "danger"
      ? {
          fg: "#F87171",
          bg: "rgba(239,68,68,0.12)",
          border: "rgba(239,68,68,0.45)",
          icon: "block" as IconName,
        }
      : tone === "info"
        ? {
            fg: "#60A5FA",
            bg: "rgba(59,130,246,0.18)",
            border: "rgba(59,130,246,0.50)",
            icon: "directions-car" as IconName,
          }
        : {
            fg: COLORS.amber,
            bg: "rgba(245,158,11,0.12)",
            border: "rgba(245,158,11,0.45)",
            icon: "hourglass-empty" as IconName,
          };
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 14,
        backgroundColor: palette.bg,
        borderWidth: 1,
        borderColor: palette.border,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <MaterialIcons name={palette.icon} size={18} color={palette.fg} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.fg, fontSize: 13, fontWeight: "800" }}>
          {title}
        </Text>
        <Text
          style={{
            color: palette.fg,
            fontSize: 12,
            marginTop: 2,
            lineHeight: 17,
          }}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

function StopPicker({
  visible,
  title,
  options,
  selected,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onClose: () => void;
  onPick: (v: string) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: "100%",
            maxWidth: 380,
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <LinearGradient
            colors={[COLORS.card, COLORS.cardAlt]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 18 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: COLORS.textLight,
                  fontSize: 16,
                  fontWeight: "800",
                  letterSpacing: -0.2,
                }}
              >
                {title}
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <MaterialIcons name="close" size={16} color="white" />
              </Pressable>
            </View>
            <View style={{ gap: 8 }}>
              {options.map((o) => {
                const isSelected = o === selected;
                return (
                  <Pressable
                    key={o}
                    onPress={() => onPick(o)}
                    style={({ pressed }) => ({
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: isSelected
                        ? COLORS.accentSoft
                        : "rgba(0,0,0,0.22)",
                      borderWidth: 1,
                      borderColor: isSelected
                        ? COLORS.accentEdge
                        : COLORS.border,
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        flex: 1,
                      }}
                    >
                      <MaterialIcons
                        name="location-city"
                        size={16}
                        color={isSelected ? COLORS.accent : COLORS.textMuted}
                      />
                      <Text
                        style={{
                          color: isSelected ? COLORS.accent : COLORS.textLight,
                          fontSize: 14,
                          fontWeight: "800",
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {o}
                      </Text>
                    </View>
                    {isSelected ? (
                      <MaterialIcons
                        name="check-circle"
                        size={18}
                        color={COLORS.accent}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
