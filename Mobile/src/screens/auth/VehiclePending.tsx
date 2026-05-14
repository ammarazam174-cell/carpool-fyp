import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { listMyVehicles, type VehicleDto } from "@/api/api";
import { useAuth } from "@/auth/AuthContext";
import { COLORS } from "@/theme/colors";

// Shown to drivers who have uploaded a vehicle but none of their vehicles
// is admin-approved yet. Root navigator gates this purely off
// `user.hasApprovedVehicle`; this screen's job is to poll + refresh so the
// driver moves on automatically once admin flips the switch.
export default function VehiclePending() {
  const insets = useSafeAreaInsets();
  const { refreshUser, logout } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const list = await listMyVehicles();
        setVehicles(list);
        // refreshUser() will flip hasApprovedVehicle and RootNavigator will
        // swap stacks automatically — this screen unmounts on its own.
        await refreshUser();
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ??
          err?.message ??
          "Could not load vehicle status.";
        setError(typeof msg === "string" ? msg : "Could not load vehicle status.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refreshUser]
  );

  useEffect(() => {
    load("initial");
  }, [load]);

  // Auto-poll every 30s so drivers don't have to keep tapping the button while
  // they wait for the admin.
  useEffect(() => {
    const t = setInterval(() => {
      load("refresh");
    }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.5,
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
  }, [pulse]);

  const confirmLogout = () => {
    Alert.alert("Sign out?", "You'll need to log in again to continue.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const latest = vehicles[0];
  const hasRejected = vehicles.some(
    (v) => !v.isVerified && !!v.rejectionReason
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <LinearGradient
        colors={[COLORS.primaryMid, COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 14,
          paddingBottom: 24,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: "rgba(255,255,255,0.12)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.22)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Animated.View style={{ opacity: pulse }}>
              <MaterialIcons name="hourglass-top" size={28} color="white" />
            </Animated.View>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: "800" }}
            >
              VEHICLE VERIFICATION
            </Text>
            <Text
              style={{
                color: "white",
                fontSize: 20,
                fontWeight: "800",
                letterSpacing: -0.3,
                marginTop: 2,
              }}
            >
              Under Review
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 32,
          gap: 14,
        }}
      >
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={COLORS.accent} size="large" />
            <Text
              style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 10 }}
            >
              Checking vehicle status…
            </Text>
          </View>
        ) : (
          <>
            <SectionCard>
              <Text
                style={{
                  color: COLORS.textLight,
                  fontSize: 16,
                  fontWeight: "800",
                  marginBottom: 6,
                }}
              >
                Waiting for admin approval
              </Text>
              <Text
                style={{
                  color: COLORS.textMuted,
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                An admin needs to verify your vehicle and its registration
                document before you can publish rides. We'll move you to the
                dashboard automatically as soon as it's approved.
              </Text>
            </SectionCard>

            {latest ? (
              <SectionCard>
                <Text
                  style={{
                    color: COLORS.textDim,
                    fontSize: 10.5,
                    fontWeight: "800",
                    letterSpacing: 0.3,
                    marginBottom: 6,
                  }}
                >
                  LATEST SUBMISSION
                </Text>
                <Text
                  style={{
                    color: COLORS.textLight,
                    fontSize: 15,
                    fontWeight: "800",
                  }}
                >
                  {latest.make} {latest.model}
                </Text>
                <Text
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  Plate · {latest.plateNumber} · {latest.seats} seats
                </Text>
                {latest.rejectionReason ? (
                  <View
                    style={{
                      marginTop: 12,
                      padding: 10,
                      borderRadius: 10,
                      backgroundColor: "rgba(239,68,68,0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(239,68,68,0.40)",
                    }}
                  >
                    <Text
                      style={{ color: "#F87171", fontSize: 12, fontWeight: "800" }}
                    >
                      Rejected · {latest.rejectionReason}
                    </Text>
                  </View>
                ) : null}
              </SectionCard>
            ) : (
              <SectionCard>
                <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                  No vehicles found on your profile. Add a vehicle to start
                  verification.
                </Text>
              </SectionCard>
            )}

            {hasRejected ? (
              <View
                style={{
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: "rgba(245,158,11,0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(245,158,11,0.40)",
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <MaterialIcons
                  name="info-outline"
                  size={18}
                  color={COLORS.amber}
                />
                <Text
                  style={{
                    color: COLORS.amber,
                    fontSize: 12,
                    lineHeight: 17,
                    flex: 1,
                  }}
                >
                  One of your vehicles was rejected. Add a new vehicle with
                  valid documents to proceed.
                </Text>
              </View>
            ) : null}

            {error ? (
              <View
                style={{
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: COLORS.dangerBg,
                  borderWidth: 1,
                  borderColor: COLORS.dangerBorder,
                }}
              >
                <Text
                  style={{
                    color: COLORS.dangerText,
                    fontSize: 13,
                    fontWeight: "800",
                  }}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => load("refresh")}
              disabled={refreshing}
              style={({ pressed }) => ({
                borderRadius: 14,
                overflow: "hidden",
                opacity: refreshing ? 0.6 : 1,
                transform: [{ scale: pressed && !refreshing ? 0.98 : 1 }],
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
                  paddingVertical: 13,
                }}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialIcons name="refresh" size={18} color="white" />
                )}
                <Text
                  style={{
                    color: "white",
                    fontSize: 14.5,
                    fontWeight: "800",
                    letterSpacing: 0.3,
                  }}
                >
                  {refreshing ? "Checking…" : "Check status"}
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={confirmLogout}
              style={({ pressed }) => ({
                marginTop: 4,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.45)",
                backgroundColor: "rgba(239,68,68,0.06)",
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text
                style={{ color: "#F87171", fontSize: 13, fontWeight: "800" }}
              >
                Sign out
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
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
        {children}
      </LinearGradient>
    </View>
  );
}
