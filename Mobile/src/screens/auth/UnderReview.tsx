import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/auth/AuthContext";

const LOGO = require("../../../assets/logo.png");

const COLORS = {
  primary: "#14532D",
  primaryMid: "#166534",
  primaryDark: "#0F3D21",
  secondary: "#16A34A",
  accent: "#D4AF37",
  bgSoft: "#F3F6F4",
  cardBg: "#FFFFFF",
  labelDark: "#111827",
  muted: "#6B7280",
  amberBg: "#FEF3C7",
  amberText: "#92400E",
  amberBorder: "#FCD34D",
};

export default function UnderReview() {
  const { user, markProfileComplete, logout } = useAuth();
  const [busy, setBusy] = useState(false);

  async function onContinue() {
    setBusy(true);
    // Flipping the flag causes RootNavigator to re-evaluate:
    //   Driver without a vehicle → AddVehicle stack
    //   Driver with vehicle / Passenger → role tabs
    await markProfileComplete();
    // No further navigation needed — the root navigator swaps stacks.
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bgSoft }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[COLORS.primaryMid, COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 56, paddingBottom: 40, paddingHorizontal: 20 }}
      >
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 20,
              padding: 10,
              backgroundColor: "white",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 14,
              elevation: 10,
            }}
          >
            <Image source={LOGO} resizeMode="contain" style={{ width: 76, height: 76 }} />
          </View>
          <Text
            style={{
              color: "white",
              fontSize: 24,
              fontWeight: "800",
              letterSpacing: -0.3,
              marginTop: 16,
            }}
          >
            Under Review
          </Text>
          <Text
            style={{
              color: COLORS.accent,
              fontSize: 13,
              fontWeight: "500",
              marginTop: 4,
              textAlign: "center",
            }}
          >
            Documents submitted successfully
          </Text>
        </View>
      </LinearGradient>

      <View
        style={{
          marginTop: -20,
          marginHorizontal: 16,
          borderRadius: 20,
          padding: 22,
          backgroundColor: COLORS.cardBg,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 4,
        }}
      >
        <View style={{ alignItems: "center", marginBottom: 18 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: COLORS.amberBg,
              borderWidth: 2,
              borderColor: COLORS.amberBorder,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Feather name="clock" size={32} color={COLORS.amberText} />
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: COLORS.labelDark,
              textAlign: "center",
            }}
          >
            Thanks, {user?.fullName?.split(" ")[0] ?? "friend"}!
          </Text>
          <Text
            style={{
              color: COLORS.muted,
              fontSize: 13,
              textAlign: "center",
              marginTop: 6,
              lineHeight: 19,
            }}
          >
            Our team is reviewing your documents. This usually takes under 24 hours.
            {"\n"}You can continue setting up while you wait.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#ECFDF5",
            borderWidth: 1,
            borderColor: "#A7F3D0",
            borderRadius: 12,
            padding: 12,
            marginBottom: 18,
          }}
        >
          <ChecklistRow done label="Documents uploaded" />
          <ChecklistRow
            done={false}
            label={
              user?.role === "Driver"
                ? "Add your vehicle to start offering rides"
                : "Admin verification"
            }
          />
        </View>

        <Pressable
          onPress={onContinue}
          disabled={busy}
          style={({ pressed }) => ({
            borderRadius: 14,
            overflow: "hidden",
            opacity: busy ? 0.7 : 1,
            transform: [{ scale: pressed && !busy ? 0.97 : 1 }],
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 6,
          })}
        >
          <LinearGradient
            colors={[COLORS.primaryMid, COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 52,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
            }}
          >
            {busy ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: "700",
                    letterSpacing: 0.3,
                  }}
                >
                  {user?.role === "Driver" ? "Continue to Next Step" : "Go to Dashboard"}
                </Text>
                <Feather name="arrow-right" size={18} color="white" />
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => logout()}
          hitSlop={8}
          style={{ marginTop: 16, alignSelf: "center" }}
        >
          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: "600" }}>
            Sign out
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: done ? COLORS.secondary : "#E5E7EB",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Feather
          name={done ? "check" : "circle"}
          size={12}
          color={done ? "white" : "#9CA3AF"}
        />
      </View>
      <Text
        style={{
          flex: 1,
          color: done ? COLORS.secondary : COLORS.labelDark,
          fontSize: 13,
          fontWeight: done ? "700" : "500",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
