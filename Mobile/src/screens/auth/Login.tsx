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
import { useAuth } from "@/auth/AuthContext";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/navigation/AuthStack";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

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
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  dangerBorder: "#FECACA",
};

export default function Login({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!email.trim() || !password) {
      setServerError("Email and password are required.");
      return;
    }
    setBusy(true);
    setServerError("");
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      // Backend returns 403 with { needsEmailVerification: true, email }
      // when the account exists but its email isn't verified yet. Route
      // the user back into the OTP flow instead of showing an error.
      const payload = err?.response?.data;
      if (
        err?.response?.status === 403 &&
        payload &&
        typeof payload === "object" &&
        payload.needsEmailVerification
      ) {
        navigation.navigate("OtpVerification", {
          email: payload.email ?? email.trim(),
          purpose: "SignupEmail",
        });
        return;
      }
      const msg =
        payload?.message ?? payload ?? err?.message ?? "Could not sign in. Try again.";
      setServerError(typeof msg === "string" ? msg : "Could not sign in. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function onForgotPassword() {
    navigation.navigate("ForgotPassword");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: COLORS.bgSoft }}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.bgSoft }}
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={[COLORS.primaryMid, COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 64,
            paddingBottom: 48,
            paddingHorizontal: 20,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 104,
              height: 104,
              borderRadius: 24,
              padding: 12,
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
              style={{ width: 80, height: 80 }}
            />
          </View>

          <Text
            style={{
              color: "white",
              fontSize: 30,
              fontWeight: "800",
              letterSpacing: -0.5,
              marginTop: 18,
            }}
          >
            Saffar
          </Text>
          <Text
            style={{
              color: COLORS.accent,
              fontSize: 13,
              fontWeight: "500",
              marginTop: 4,
            }}
          >
            Pakistan's trusted carpooling platform
          </Text>
        </LinearGradient>

        {/* ── Form card ── */}
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
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: COLORS.primary,
            }}
          >
            Welcome Back
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: COLORS.muted,
              marginTop: 4,
              marginBottom: 20,
            }}
          >
            Sign in to continue your journey
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

          {/* Email */}
          <FormLabel>Email Address</FormLabel>
          <InputBox
            icon="mail"
            focused={emailFocused}
            hasError={false}
          >
            <TextInput
              placeholder="you@example.com"
              placeholderTextColor={COLORS.gray}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={inputTextStyle}
            />
          </InputBox>

          {/* Password */}
          <View style={{ height: 16 }} />
          <FormLabel>Password</FormLabel>
          <InputBox icon="lock" focused={pwFocused} hasError={false}>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor={COLORS.gray}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPwFocused(true)}
              onBlur={() => setPwFocused(false)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={inputTextStyle}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color={COLORS.secondary}
              />
            </Pressable>
          </InputBox>

          {/* Forgot password */}
          <View style={{ alignItems: "flex-end", marginTop: 10 }}>
            <Pressable onPress={onForgotPassword} hitSlop={8}>
              <Text
                style={{
                  color: COLORS.secondary,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                Forgot Password?
              </Text>
            </Pressable>
          </View>

          {/* Submit */}
          <Pressable
            onPress={onSubmit}
            disabled={busy}
            style={({ pressed }) => ({
              marginTop: 18,
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
                  <Text
                    style={{ color: "white", fontSize: 16, fontWeight: "700" }}
                  >
                    Signing in…
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
                    Sign In
                  </Text>
                  <Feather name="arrow-right" size={18} color="white" />
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Divider */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginVertical: 20,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
            <Text
              style={{
                marginHorizontal: 12,
                color: COLORS.muted,
                fontSize: 12,
                fontWeight: "500",
              }}
            >
              OR
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
          </View>

          {/* Signup link */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>
              Don't have an account?{" "}
            </Text>
            <Pressable onPress={() => navigation.navigate("Signup")} hitSlop={6}>
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                Sign up
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Footer */}
        <View style={{ alignItems: "center", marginTop: 24 }}>
          <View
            style={{
              height: 3,
              width: 48,
              borderRadius: 999,
              backgroundColor: COLORS.accent,
            }}
          />
          <Text style={{ marginTop: 8, color: COLORS.muted, fontSize: 11 }}>
            Safe • Verified • Trusted
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

type FeatherName = React.ComponentProps<typeof Feather>["name"];

function FormLabel({ children }: { children: React.ReactNode }) {
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

function InputBox({
  icon,
  focused,
  hasError,
  children,
}: {
  icon: FeatherName;
  focused: boolean;
  hasError: boolean;
  children: React.ReactNode;
}) {
  const borderColor = hasError
    ? "#F87171"
    : focused
    ? COLORS.secondary
    : "transparent";
  const iconColor = hasError ? "#DC2626" : focused ? COLORS.secondary : COLORS.muted;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: hasError ? COLORS.dangerBg : COLORS.inputBg,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor,
        paddingHorizontal: 12,
        height: 50,
      }}
    >
      <Feather name={icon} size={18} color={iconColor} style={{ marginRight: 10 }} />
      {children}
    </View>
  );
}

const inputTextStyle = {
  flex: 1,
  fontSize: 14,
  color: COLORS.labelDark,
  paddingVertical: 0,
} as const;
