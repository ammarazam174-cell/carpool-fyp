import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { resetPassword } from "@/api/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/navigation/AuthStack";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;
type FocusedField = "otp" | "password" | "confirm" | null;

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

export default function ResetPassword({ route, navigation }: Props) {
  const { email, devOtp } = route.params;

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<FocusedField>(null);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  async function onSubmit() {
    if (otp.length !== 6) {
      setServerError("Enter the 6-digit code sent to your email.");
      return;
    }
    if (password.length < 6) {
      setServerError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setServerError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setServerError("");
    try {
      await resetPassword({ email, otp, newPassword: password });
      Alert.alert(
        "Password reset",
        "Your password has been updated. Please sign in with your new password.",
        [{ text: "OK", onPress: () => navigation.replace("Login") }]
      );
    } catch (err: any) {
      const msg =
        err?.response?.data ?? err?.message ?? "Could not reset password.";
      setServerError(typeof msg === "string" ? msg : "Could not reset password.");
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

          <Text style={{ color: "white", fontSize: 26, fontWeight: "800", marginTop: 16 }}>
            Verify & Reset
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
            Code sent to {email}
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
            Enter code & new password
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: COLORS.muted,
              marginTop: 4,
              marginBottom: 20,
            }}
          >
            The code expires in 15 minutes.
          </Text>

          {devOtp ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#FEF3C7",
                backgroundColor: "#FFFBEB",
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 14,
              }}
            >
              <Feather name="info" size={14} color="#B45309" />
              <Text style={{ flex: 1, color: "#92400E", fontSize: 12 }}>
                Dev mode code:{" "}
                <Text style={{ fontWeight: "700", letterSpacing: 1 }}>{devOtp}</Text>
              </Text>
            </View>
          ) : null}

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

          {/* OTP */}
          <Label>6-digit Code</Label>
          <FieldBox
            icon="shield"
            focused={focused === "otp"}
          >
            <TextInput
              placeholder="• • • • • •"
              placeholderTextColor={COLORS.gray}
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
              onFocus={() => setFocused("otp")}
              onBlur={() => setFocused(null)}
              keyboardType="number-pad"
              maxLength={6}
              style={{
                flex: 1,
                fontSize: 18,
                letterSpacing: 6,
                fontWeight: "700",
                color: COLORS.labelDark,
                paddingVertical: 0,
                textAlign: "center",
              }}
            />
          </FieldBox>

          <View style={{ height: 14 }} />

          {/* New password */}
          <Label>New Password</Label>
          <FieldBox icon="lock" focused={focused === "password"}>
            <TextInput
              placeholder="Min. 6 characters"
              placeholderTextColor={COLORS.gray}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={{
                flex: 1,
                fontSize: 14,
                color: COLORS.labelDark,
                paddingVertical: 0,
              }}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color={COLORS.secondary}
              />
            </Pressable>
          </FieldBox>

          <View style={{ height: 14 }} />

          {/* Confirm */}
          <Label>Confirm New Password</Label>
          <FieldBox icon="lock" focused={focused === "confirm"}>
            <TextInput
              placeholder="Re-enter password"
              placeholderTextColor={COLORS.gray}
              value={confirm}
              onChangeText={setConfirm}
              onFocus={() => setFocused("confirm")}
              onBlur={() => setFocused(null)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={{
                flex: 1,
                fontSize: 14,
                color: COLORS.labelDark,
                paddingVertical: 0,
              }}
            />
          </FieldBox>

          {/* Submit */}
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
                    Resetting…
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
                    Reset Password
                  </Text>
                  <Feather name="check" size={18} color="white" />
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
            <Pressable
              onPress={() => navigation.replace("ForgotPassword")}
              hitSlop={6}
            >
              <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: "700" }}>
                Resend code
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FeatherName = React.ComponentProps<typeof Feather>["name"];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.labelDark,
        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  );
}

function FieldBox({
  icon,
  focused,
  children,
}: {
  icon: FeatherName;
  focused: boolean;
  children: React.ReactNode;
}) {
  return (
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
        name={icon}
        size={18}
        color={focused ? COLORS.secondary : COLORS.muted}
        style={{ marginRight: 10 }}
      />
      {children}
    </View>
  );
}
