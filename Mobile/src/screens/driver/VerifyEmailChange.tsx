import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { requestEmailChangeOtp, verifyEmailChangeOtp } from "@/api/api";
import { useAuth } from "@/auth/AuthContext";
import { COLORS } from "@/theme/colors";
import type { DriverStackParamList } from "@/navigation/DriverStack";

type Nav = NativeStackNavigationProp<DriverStackParamList, "VerifyEmailChange">;
type RouteT = RouteProp<DriverStackParamList, "VerifyEmailChange">;

const RESEND_COOLDOWN_SECONDS = 60;
const CODE_LENGTH = 6;

export default function VerifyEmailChange() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { newEmail } = useRoute<RouteT>().params;
  const { refreshUser } = useAuth();

  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Auto-focus first input on mount.
  useEffect(() => {
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  // Resend cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const code = useMemo(() => digits.join(""), [digits]);
  const complete = code.length === CODE_LENGTH && /^\d{6}$/.test(code);

  const setDigit = useCallback((i: number, v: string) => {
    // Strip non-digits. Pasting all 6 at once distributes across cells.
    const cleaned = v.replace(/\D/g, "");
    if (cleaned.length === 0) {
      setDigits((prev) => {
        const next = [...prev];
        next[i] = "";
        return next;
      });
      return;
    }
    if (cleaned.length === 1) {
      setDigits((prev) => {
        const next = [...prev];
        next[i] = cleaned;
        return next;
      });
      if (i < CODE_LENGTH - 1) inputRefs.current[i + 1]?.focus();
    } else {
      // Multi-char paste — fill from current position.
      setDigits((prev) => {
        const next = [...prev];
        for (let k = 0; k < cleaned.length && i + k < CODE_LENGTH; k++) {
          next[i + k] = cleaned[k];
        }
        return next;
      });
      const focusIdx = Math.min(i + cleaned.length, CODE_LENGTH - 1);
      inputRefs.current[focusIdx]?.focus();
    }
    setError(null);
  }, []);

  const onKeyPress = useCallback(
    (i: number, key: string) => {
      if (key === "Backspace" && !digits[i] && i > 0) {
        inputRefs.current[i - 1]?.focus();
      }
    },
    [digits]
  );

  const onVerify = useCallback(async () => {
    if (!complete || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await verifyEmailChangeOtp(newEmail, code);
      setSuccess("Email updated. Redirecting…");
      // Refresh session user so the Profile screen reflects the new email.
      await refreshUser().catch(() => {});
      // Brief delay so the success state is visible.
      setTimeout(() => {
        navigation.goBack();
      }, 700);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (typeof err?.response?.data === "string" ? err.response.data : null) ??
        err?.message ??
        "Verification failed. Please try again.";
      setError(typeof msg === "string" ? msg : "Verification failed.");
      // Clear digits so user can retype after a wrong code.
      setDigits(Array(CODE_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setSubmitting(false);
    }
  }, [complete, submitting, newEmail, code, refreshUser, navigation]);

  const onResend = useCallback(async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await requestEmailChangeOtp(newEmail);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setSuccess("New code sent.");
      setTimeout(() => setSuccess(null), 2500);
    } catch (err: any) {
      // Backend returns 429 with retryAfterSeconds for cooldown violations.
      const retryAfter = err?.response?.data?.retryAfterSeconds;
      if (typeof retryAfter === "number" && retryAfter > 0) {
        setCooldown(retryAfter);
      }
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        "Could not resend the code.";
      setError(typeof msg === "string" ? msg : "Could not resend the code.");
    } finally {
      setResending(false);
    }
  }, [cooldown, resending, newEmail]);

  const onCancel = useCallback(() => {
    if (submitting) return;
    Alert.alert(
      "Cancel email change?",
      "Your email will not be changed. You can try again later.",
      [
        { text: "Keep verifying", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  }, [submitting, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
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
            onPress={onCancel}
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
            <Text style={{ color: "white", fontSize: 20, fontWeight: "800", letterSpacing: -0.3 }}>
              Verify Email
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
              Confirm the change to your new address
            </Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 32,
            gap: 18,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Info card */}
          <View
            style={{
              padding: 16,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.05)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
            }}
          >
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
                <MaterialIcons name="mark-email-read" size={18} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.4 }}>
                  CODE SENT TO
                </Text>
                <Text
                  style={{ color: "white", fontSize: 14, fontWeight: "700", marginTop: 2 }}
                  numberOfLines={1}
                >
                  {newEmail}
                </Text>
              </View>
            </View>
            <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 12, lineHeight: 18 }}>
              Enter the 6-digit verification code we sent to your new email. The code expires in 10 minutes.
            </Text>
          </View>

          {/* OTP inputs */}
          <View>
            <Text
              style={{
                color: COLORS.textDim,
                fontSize: 11,
                fontWeight: "800",
                letterSpacing: 0.5,
                marginBottom: 10,
              }}
            >
              VERIFICATION CODE
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => {
                    inputRefs.current[i] = ref;
                  }}
                  value={d}
                  onChangeText={(v) => setDigit(i, v)}
                  onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={CODE_LENGTH}
                  textContentType="oneTimeCode"
                  autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
                  selectTextOnFocus
                  editable={!submitting}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    textAlign: "center",
                    fontSize: 22,
                    fontWeight: "800",
                    color: "white",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1.5,
                    borderColor: d ? COLORS.accentEdge : "rgba(255,255,255,0.10)",
                    borderRadius: 12,
                  }}
                />
              ))}
            </View>
          </View>

          {/* Inline error */}
          {error ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                padding: 12,
                borderRadius: 12,
                backgroundColor: "rgba(239,68,68,0.12)",
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.4)",
              }}
            >
              <MaterialIcons name="error-outline" size={16} color="#FCA5A5" />
              <Text style={{ color: "#FCA5A5", fontSize: 12.5, fontWeight: "600", flex: 1 }}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Inline success */}
          {success ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                padding: 12,
                borderRadius: 12,
                backgroundColor: COLORS.accentSoft,
                borderWidth: 1,
                borderColor: COLORS.accentEdge,
              }}
            >
              <MaterialIcons name="check-circle" size={16} color={COLORS.accent} />
              <Text style={{ color: COLORS.accent, fontSize: 12.5, fontWeight: "700", flex: 1 }}>
                {success}
              </Text>
            </View>
          ) : null}

          {/* Verify button */}
          <View
            style={{
              shadowColor: COLORS.accent,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: complete && !submitting ? 0.35 : 0,
              shadowRadius: 12,
              elevation: complete && !submitting ? 8 : 0,
            }}
          >
            <Pressable
              onPress={onVerify}
              disabled={!complete || submitting}
              style={({ pressed }) => ({
                borderRadius: 14,
                overflow: "hidden",
                opacity: !complete ? 0.55 : 1,
                transform: [{ scale: pressed && complete && !submitting ? 0.97 : 1 }],
              })}
            >
              <LinearGradient
                colors={
                  complete && !submitting
                    ? [COLORS.accent, "#16A34A"]
                    : [COLORS.card, COLORS.cardAlt]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 14,
                  borderWidth: complete ? 0 : 1,
                  borderColor: COLORS.border,
                }}
              >
                {submitting ? (
                  <>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={{ color: "white", fontSize: 14.5, fontWeight: "800", letterSpacing: 0.3 }}>
                      Verifying…
                    </Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons
                      name="verified"
                      size={18}
                      color={complete ? "white" : COLORS.textMuted}
                    />
                    <Text
                      style={{
                        color: complete ? "white" : COLORS.textMuted,
                        fontSize: 14.5,
                        fontWeight: "800",
                        letterSpacing: 0.3,
                      }}
                    >
                      Verify & Update Email
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Resend */}
          <View style={{ alignItems: "center", marginTop: 4 }}>
            {cooldown > 0 ? (
              <Text style={{ color: COLORS.textMuted, fontSize: 12.5 }}>
                Didn't receive a code? Resend in{" "}
                <Text style={{ color: "white", fontWeight: "800" }}>{cooldown}s</Text>
              </Text>
            ) : (
              <Pressable
                onPress={onResend}
                disabled={resending}
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : resending ? 0.5 : 1 })}
              >
                <Text
                  style={{
                    color: COLORS.accent,
                    fontSize: 13,
                    fontWeight: "800",
                    letterSpacing: 0.3,
                  }}
                >
                  {resending ? "Resending…" : "Resend code"}
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
