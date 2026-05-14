import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { forgotPassword } from "@/api/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/navigation/AuthStack";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

const LOGO = require("../../../assets/logo.png");

const COLORS = {
  primary: "#14532D",
  primaryMid: "#166534",
  primaryDark: "#0F3D21",
  secondary: "#16A34A",
  accent: "#D4AF37",
  bgSoft: "#F3F6F4",
  inputBg: "#F9FAFB",
  labelDark: "#111827",
  muted: "#6B7280",
  gray: "#9CA3AF",
  dangerBg: "#FEF2F2",
  dangerBorder: "#FECACA",
};

export default function ForgotPassword({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  function validEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  async function onSubmit() {
    const trimmed = email.trim();
    if (!validEmail(trimmed)) {
      setServerError("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    setServerError("");
    try {
      const res = await forgotPassword({ email: trimmed });
      navigation.navigate("ResetPassword", {
        email: trimmed,
        devOtp: res.devOtp,
      });
    } catch (err: any) {
      const msg =
        err?.response?.data ?? err?.message ?? "Could not send reset code.";
      setServerError(typeof msg === "string" ? msg : "Could not send reset code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: COLORS.bgSoft }}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.bgSoft }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[COLORS.primaryMid, COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 56,
            paddingBottom: 48,
            paddingHorizontal: 20,
            alignItems: "center",
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={{
              position: "absolute",
              left: 16,
              top: 52,
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.15)",
            }}
          >
            <Feather name="arrow-left" size={18} color="white" />
          </Pressable>

          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              padding: 10,
              backgroundColor: "white",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 14,
              elevation: 10,
            }}
          >
            <Image
              source={LOGO}
              resizeMode="contain"
              style={{ width: 68, height: 68 }}
            />
          </View>

          <Text
            style={{
              color: "white",
              fontSize: 26,
              fontWeight: "800",
              marginTop: 16,
            }}
          >
            Forgot Password?
          </Text>
          <Text
            style={{
              color: COLORS.accent,
              fontSize: 13,
              fontWeight: "500",
              marginTop: 4,
              textAlign: "center",
              paddingHorizontal: 10,
            }}
          >
            Enter your email and we'll send you a 6-digit code
          </Text>
        </LinearGradient>

        <View
          style={{
            marginTop: -24,
            marginHorizontal: 16,
            borderRadius: 20,
            padding: 22,
            backgroundColor: "white",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.primary }}>
            Reset your password
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: COLORS.muted,
              marginTop: 4,
              marginBottom: 20,
            }}
          >
            We'll send a verification code to your registered email.
          </Text>

          {serverError ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.dangerBorder,
                backgroundColor: COLORS.dangerBg,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 14,
              }}
            >
              <Feather name="alert-circle" size={14} color="#DC2626" />
              <Text style={{ flex: 1, color: "#B91C1C", fontSize: 13 }}>
                {serverError}
              </Text>
            </View>
          ) : null}

          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: COLORS.labelDark,
              marginBottom: 6,
            }}
          >
            Email Address
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: COLORS.inputBg,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: focused ? COLORS.secondary : "transparent",
              paddingHorizontal: 12,
              height: 50,
            }}
          >
            <Feather
              name="mail"
              size={18}
              color={focused ? COLORS.secondary : COLORS.muted}
              style={{ marginRight: 10 }}
            />
            <TextInput
              placeholder="you@example.com"
              placeholderTextColor={COLORS.gray}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                fontSize: 14,
                color: COLORS.labelDark,
                paddingVertical: 0,
              }}
            />
          </View>

          <Pressable
            onPress={onSubmit}
            disabled={busy}
            style={({ pressed }) => ({
              marginTop: 20,
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
                <>
                  <ActivityIndicator color="white" />
                  <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
                    Sending…
                  </Text>
                </>
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
                    Send Reset Code
                  </Text>
                  <Feather name="send" size={16} color="white" />
                </>
              )}
            </LinearGradient>
          </Pressable>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 18,
            }}
          >
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>
              Remembered it?{" "}
            </Text>
            <Pressable onPress={() => navigation.navigate("Login")} hitSlop={6}>
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                Sign in
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
