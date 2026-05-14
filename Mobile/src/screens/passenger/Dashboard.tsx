import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import * as Location from "expo-location";
import { listRides } from "@/api/api";
import { useAuth } from "@/auth/AuthContext";
import RideCard from "@/components/RideCard";
import { COLORS } from "@/theme/colors";
import { hasDeparted } from "@/utils/datetime";
import type { Ride } from "@/types/ride";
import type { PassengerLocation } from "@/types/location";
import type { PassengerStackParamList } from "@/navigation/PassengerStack";

type Nav = NativeStackNavigationProp<PassengerStackParamList>;

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const CITIES = ["Karachi", "Hyderabad"] as const;
type City = (typeof CITIES)[number];
type CityFilter = City | "Any";

export default function PassengerDashboard() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user, refreshUser } = useAuth();
  const isApproved = user?.status === "Approved";

  const [fromCity, setFromCity] = useState<CityFilter>("Any");
  const [toCity, setToCity] = useState<CityFilter>("Any");
  const [openPicker, setOpenPicker] = useState<"from" | "to" | null>(null);
  const [location, setLocation] = useState<PassengerLocation | null>(null);
  const [locating, setLocating] = useState(false);

  const requestLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location permission needed",
          "We need your location to match you with nearby pickups. Please enable location access from Settings."
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      let address: string | undefined;
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const first = results[0];
        if (first) {
          address = [first.name, first.street, first.city, first.region]
            .filter(Boolean)
            .join(", ");
        }
      } catch {
        // Reverse geocoding failing is non-fatal — we still have coords.
      }
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        address,
      });
    } catch (err: any) {
      Alert.alert(
        "Couldn't get location",
        err?.message ?? "Please try again or check your device settings."
      );
    } finally {
      setLocating(false);
    }
  }, []);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["rides"],
    queryFn: listRides,
  });

  // Refresh user + rides whenever the screen comes into focus so admin
  // approval reflects without a cold restart.
  useFocusEffect(
    useCallback(() => {
      refreshUser().catch(() => {});
      refetch().catch(() => {});
    }, [refreshUser, refetch])
  );

  const rides = useMemo<Ride[]>(() => {
    const list = data ?? [];
    return list.filter((r) => {
      if ((r.status ?? "").toLowerCase() === "completed") return false;
      if (hasDeparted(r.departureTime)) return false;
      if (fromCity !== "Any") {
        if (!r.fromAddress?.toLowerCase().includes(fromCity.toLowerCase()))
          return false;
      }
      if (toCity !== "Any") {
        if (!r.toAddress?.toLowerCase().includes(toCity.toLowerCase()))
          return false;
      }
      return true;
    });
  }, [data, fromCity, toCity]);

  const firstName = useMemo(() => {
    const n = user?.fullName?.trim();
    if (!n) return "there";
    return n.split(/\s+/)[0];
  }, [user?.fullName]);

  const handleRidePress = useCallback(
    (ride: Ride) => {
      if (user?.id != null && String(ride.driverId) === String(user.id)) {
        Alert.alert("Your ride", "You can't book your own ride.");
        return;
      }
      if (hasDeparted(ride.departureTime)) {
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
      if (!location) {
        Alert.alert(
          "Location required",
          "Please set your current location before booking a ride.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Use my location", onPress: () => requestLocation() },
          ]
        );
        return;
      }
      navigation.navigate("RideDetail", { ride, location });
    },
    [isApproved, navigation, location, requestLocation, user?.id]
  );

  const pick = (which: "from" | "to", value: CityFilter) => {
    if (which === "from") {
      setFromCity(value);
      // If the user picks the same city for From that they already picked
      // for To, clear To to keep the invariant "From ≠ To".
      if (value !== "Any" && toCity === value) setToCity("Any");
    } else {
      setToCity(value);
    }
    setOpenPicker(null);
  };

  const resetFilters = () => {
    setFromCity("Any");
    setToCity("Any");
  };

  const filtersActive = fromCity !== "Any" || toCity !== "Any";

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* GRADIENT HEADER */}
      <LinearGradient
        colors={[COLORS.primaryMid, COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 18,
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
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text
              style={{
                color: "white",
                fontSize: 22,
                fontWeight: "800",
                letterSpacing: -0.3,
              }}
              numberOfLines={1}
            >
              Hi, {firstName} 👋
            </Text>
            <Text
              style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}
            >
              Available rides
            </Text>
          </View>
          {rides.length > 0 ? (
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
          ) : null}
        </View>
      </LinearGradient>

      <FlatList<Ride>
        data={rides}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: insets.bottom + 110,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <ListHeader
            fromCity={fromCity}
            toCity={toCity}
            onOpenPicker={setOpenPicker}
            onReset={resetFilters}
            filtersActive={filtersActive}
            isApproved={isApproved}
            location={location}
            locating={locating}
            onRequestLocation={requestLocation}
            onClearLocation={() => setLocation(null)}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState
              error={(error as Error)?.message ?? "Unknown error"}
              onRetry={() => refetch()}
            />
          ) : (
            <EmptyState filtersActive={filtersActive} onReset={resetFilters} />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refreshUser().catch(() => {});
              refetch();
            }}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
        renderItem={({ item }) => {
          const notReady = !isApproved || !location;
          const notReadyReason = !isApproved
            ? "Awaiting admin approval"
            : !location
              ? "Set location to book"
              : undefined;
          return (
            <RideCard
              ride={item}
              currentUserId={user?.id}
              notReady={notReady}
              notReadyReason={notReadyReason}
              onPress={handleRidePress}
            />
          );
        }}
      />

      {/* CITY PICKER MODAL */}
      <CityPicker
        visible={openPicker !== null}
        title={openPicker === "from" ? "Select origin" : "Select destination"}
        selected={openPicker === "from" ? fromCity : toCity}
        disabledCity={
          openPicker === "to" && fromCity !== "Any" ? fromCity : null
        }
        onClose={() => setOpenPicker(null)}
        onPick={(v) => openPicker && pick(openPicker, v)}
      />
    </View>
  );
}

function ListHeader({
  fromCity,
  toCity,
  onOpenPicker,
  onReset,
  filtersActive,
  isApproved,
  location,
  locating,
  onRequestLocation,
  onClearLocation,
}: {
  fromCity: CityFilter;
  toCity: CityFilter;
  onOpenPicker: (p: "from" | "to") => void;
  onReset: () => void;
  filtersActive: boolean;
  isApproved: boolean;
  location: PassengerLocation | null;
  locating: boolean;
  onRequestLocation: () => void;
  onClearLocation: () => void;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      {/* Search card */}
      <View
        style={{
          borderRadius: 18,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: COLORS.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.22,
          shadowRadius: 12,
          elevation: 5,
        }}
      >
        <LinearGradient
          colors={[COLORS.card, COLORS.cardAlt]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 14 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialIcons name="search" size={16} color={COLORS.accent} />
              <Text
                style={{
                  color: COLORS.textLight,
                  fontSize: 14,
                  fontWeight: "800",
                  letterSpacing: -0.2,
                }}
              >
                Search rides
              </Text>
            </View>
            {filtersActive ? (
              <Pressable
                onPress={onReset}
                hitSlop={8}
                style={({ pressed }) => ({
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 11,
                    fontWeight: "800",
                  }}
                >
                  Clear
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <DropdownButton
              icon="trip-origin"
              iconColor={COLORS.accent}
              label="FROM"
              value={fromCity}
              onPress={() => onOpenPicker("from")}
            />
            <DropdownButton
              icon="place"
              iconColor="#F87171"
              label="TO"
              value={toCity}
              onPress={() => onOpenPicker("to")}
            />
          </View>
        </LinearGradient>
      </View>

      {/* Location button */}
      <View style={{ marginTop: 12 }}>
        <LocationCard
          location={location}
          locating={locating}
          onRequest={onRequestLocation}
          onClear={onClearLocation}
        />
      </View>

      {/* Approval banner */}
      {!isApproved ? (
        <View
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            backgroundColor: "rgba(245,158,11,0.12)",
            borderWidth: 1,
            borderColor: "rgba(245,158,11,0.45)",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <MaterialIcons
            name="hourglass-empty"
            size={18}
            color={COLORS.amber}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: COLORS.amber, fontSize: 13, fontWeight: "800" }}
            >
              Profile under review
            </Text>
            <Text
              style={{
                color: COLORS.amber,
                fontSize: 12,
                marginTop: 2,
                lineHeight: 17,
              }}
            >
              You can browse rides, but booking is disabled until admin approval.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function DropdownButton({
  icon,
  iconColor,
  label,
  value,
  onPress,
}: {
  icon: IconName;
  iconColor: string;
  label: string;
  value: CityFilter;
  onPress: () => void;
}) {
  const empty = value === "Any";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: "rgba(0,0,0,0.22)",
        borderWidth: 1,
        borderColor: COLORS.border,
        opacity: pressed ? 0.7 : 1,
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
          {label}
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
          }}
          numberOfLines={1}
        >
          {empty ? "Any city" : value}
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

function LocationCard({
  location,
  locating,
  onRequest,
  onClear,
}: {
  location: PassengerLocation | null;
  locating: boolean;
  onRequest: () => void;
  onClear: () => void;
}) {
  const hasLocation = location !== null;
  const coordsText = hasLocation
    ? `${location!.latitude.toFixed(4)}, ${location!.longitude.toFixed(4)}`
    : "";

  return (
    <View
      style={{
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: hasLocation ? COLORS.accentEdge : COLORS.border,
      }}
    >
      <LinearGradient
        colors={
          hasLocation
            ? ["rgba(34,197,94,0.18)", "rgba(34,197,94,0.06)"]
            : [COLORS.card, COLORS.cardAlt]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 12 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: hasLocation
                ? "rgba(34,197,94,0.22)"
                : "rgba(0,0,0,0.22)",
              borderWidth: 1,
              borderColor: hasLocation ? COLORS.accentEdge : COLORS.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons
              name={hasLocation ? "my-location" : "location-off"}
              size={18}
              color={hasLocation ? COLORS.accent : COLORS.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: hasLocation ? COLORS.accent : COLORS.textDim,
                fontSize: 10.5,
                fontWeight: "800",
                letterSpacing: 0.3,
              }}
            >
              {hasLocation ? "LOCATION SET" : "LOCATION REQUIRED"}
            </Text>
            <Text
              style={{
                color: COLORS.textLight,
                fontSize: 13.5,
                fontWeight: "700",
                marginTop: 3,
              }}
              numberOfLines={1}
            >
              {hasLocation
                ? location?.address || coordsText
                : "Set your pickup point to book a ride"}
            </Text>
            {hasLocation && location?.address ? (
              <Text
                style={{
                  color: COLORS.textMuted,
                  fontSize: 11,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {coordsText}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={hasLocation ? onRequest : onRequest}
            disabled={locating}
            style={({ pressed }) => ({
              borderRadius: 10,
              overflow: "hidden",
              opacity: locating ? 0.7 : pressed ? 0.8 : 1,
              transform: [{ scale: pressed && !locating ? 0.97 : 1 }],
            })}
          >
            <LinearGradient
              colors={[COLORS.accent, "#16A34A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingHorizontal: 12,
                paddingVertical: 9,
              }}
            >
              {locating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <MaterialIcons
                  name={hasLocation ? "refresh" : "my-location"}
                  size={13}
                  color="white"
                />
              )}
              <Text
                style={{
                  color: "white",
                  fontSize: 11.5,
                  fontWeight: "800",
                  letterSpacing: 0.2,
                }}
              >
                {locating
                  ? "Getting…"
                  : hasLocation
                    ? "Update"
                    : "Use my location"}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
        {hasLocation ? (
          <Pressable
            onPress={onClear}
            hitSlop={6}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              marginTop: 8,
              paddingHorizontal: 8,
              paddingVertical: 3,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 11,
                fontWeight: "700",
                textDecorationLine: "underline",
              }}
            >
              Clear location
            </Text>
          </Pressable>
        ) : null}
      </LinearGradient>
    </View>
  );
}

function CityPicker({
  visible,
  title,
  selected,
  disabledCity,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  selected: CityFilter;
  disabledCity: CityFilter | null;
  onClose: () => void;
  onPick: (c: CityFilter) => void;
}) {
  const options: CityFilter[] = ["Any", ...CITIES];
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
                const isDisabled = disabledCity === o;
                return (
                  <Pressable
                    key={o}
                    onPress={() => {
                      if (isDisabled) return;
                      onPick(o);
                    }}
                    disabled={isDisabled}
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
                      opacity: isDisabled ? 0.4 : pressed ? 0.75 : 1,
                    })}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <MaterialIcons
                        name={o === "Any" ? "public" : "location-city"}
                        size={16}
                        color={isSelected ? COLORS.accent : COLORS.textMuted}
                      />
                      <Text
                        style={{
                          color: isSelected ? COLORS.accent : COLORS.textLight,
                          fontSize: 14,
                          fontWeight: "800",
                        }}
                      >
                        {o === "Any" ? "Any city" : o}
                      </Text>
                      {isDisabled ? (
                        <Text
                          style={{
                            color: COLORS.textMuted,
                            fontSize: 10,
                            fontWeight: "700",
                            marginLeft: 4,
                          }}
                        >
                          (same as From)
                        </Text>
                      ) : null}
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

function LoadingState() {
  return (
    <View
      style={{
        paddingVertical: 60,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 10 }}>
        Loading rides…
      </Text>
    </View>
  );
}

function EmptyState({
  filtersActive,
  onReset,
}: {
  filtersActive: boolean;
  onReset: () => void;
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
        <MaterialIcons name="directions-car" size={32} color={COLORS.accent} />
      </View>
      <Text
        style={{
          color: COLORS.textLight,
          fontSize: 17,
          fontWeight: "800",
          letterSpacing: -0.2,
        }}
      >
        No rides available
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
        {filtersActive
          ? "No rides match your current filters."
          : "Pull down to refresh — new rides show up here as drivers post them."}
      </Text>
      {filtersActive ? (
        <Pressable
          onPress={onReset}
          style={({ pressed }) => ({
            marginTop: 14,
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: 10,
            backgroundColor: COLORS.accent,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: "white", fontSize: 12, fontWeight: "800" }}>
            Clear filters
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ErrorState({
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
          Couldn't load rides
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
