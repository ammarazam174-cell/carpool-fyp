import { useEffect, useMemo, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { COLORS } from "@/theme/colors";
import { useDriverLocationPoll } from "@/hooks/useDriverLocationPoll";
import { parseBackendDate } from "@/utils/datetime";
import type { PassengerStackParamList } from "@/navigation/PassengerStack";

type Nav = NativeStackNavigationProp<PassengerStackParamList, "RideTracking">;
type RouteT = RouteProp<PassengerStackParamList, "RideTracking">;

export default function RideTrackingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { rideId, from, to, driverName } = useRoute<RouteT>().params;

  // Stop polling once the backend reports the ride is no longer InProgress.
  const { data, error, lastFetchedAt } = useDriverLocationPoll(
    rideId,
    true,
    5000
  );

  const rideOver =
    data?.status === "Completed" || data?.status === "Cancelled";
  const hasCoords =
    data?.driverLat != null && data?.driverLng != null;

  const region = useMemo(() => {
    if (hasCoords && data) {
      return {
        latitude: data.driverLat!,
        longitude: data.driverLng!,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    // Default to Karachi if we don't yet have a fix.
    return {
      latitude: 24.8607,
      longitude: 67.0011,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, [hasCoords, data]);

  const mapRef = useRef<MapView | null>(null);
  useEffect(() => {
    if (hasCoords && data && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: data.driverLat!,
          longitude: data.driverLng!,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500
      );
    }
  }, [data?.driverLat, data?.driverLng, hasCoords, data]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
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
              LIVE TRACKING
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
              {from} → {to}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={region}
          showsUserLocation
        >
          {hasCoords && data ? (
            <Marker
              coordinate={{
                latitude: data.driverLat!,
                longitude: data.driverLng!,
              }}
              title={driverName ?? "Driver"}
              description={
                data.driverLocationUpdatedAt
                  ? `Updated ${parseBackendDate(data.driverLocationUpdatedAt).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi" })}`
                  : undefined
              }
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: COLORS.accent,
                  borderWidth: 3,
                  borderColor: "white",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <MaterialIcons
                  name="directions-car"
                  size={18}
                  color="white"
                />
              </View>
            </Marker>
          ) : null}
        </MapView>

        {/* Status card overlay */}
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: insets.bottom + 16,
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: COLORS.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
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
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: COLORS.accentSoft,
                  borderWidth: 1,
                  borderColor: COLORS.accentEdge,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons
                  name={rideOver ? "check-circle" : "my-location"}
                  size={20}
                  color={COLORS.accent}
                />
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
                  {rideOver
                    ? "RIDE ENDED"
                    : hasCoords
                      ? "DRIVER ONLINE"
                      : "WAITING FOR DRIVER"}
                </Text>
                <Text
                  style={{
                    color: COLORS.textLight,
                    fontSize: 14,
                    fontWeight: "700",
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {rideOver
                    ? `Ride is ${data?.status?.toLowerCase() ?? "over"}`
                    : hasCoords && data?.driverLocationUpdatedAt
                      ? `Last ping ${parseBackendDate(data.driverLocationUpdatedAt).toLocaleTimeString(
                          "en-PK",
                          { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", second: "2-digit" }
                        )}`
                      : "Driver hasn't started tracking yet"}
                </Text>
                {error ? (
                  <Text
                    style={{
                      color: "#F87171",
                      fontSize: 11,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {error}
                  </Text>
                ) : lastFetchedAt ? (
                  <Text
                    style={{
                      color: COLORS.textMuted,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    Polling every 5s · last check {lastFetchedAt.toLocaleTimeString(
                      "en-PK",
                      { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", second: "2-digit" }
                    )}
                  </Text>
                ) : null}
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}
