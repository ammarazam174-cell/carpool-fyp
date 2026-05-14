import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { sendOtp, verifyOtp, type OtpPurpose } from "@/api/api";
import type { AuthStackParamList } from "@/navigation/AuthStack";

const OTP_LENGTH = 6;
const EXPIRY_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

const GREEN = "#14532D";
const GREEN_MID = "#166534";
const GREEN_DARK = "#0F3D21";
const ACCENT = "#22C55E";
const TEXT = "#ECFDF5";
const MUTED = "#A7F3D0";
const DIM = "#6EE7B7";
const CARD = "#064E3B";
const CARD_ALT = "#065F46";
const BORDER = "#047857";
const DANGER = "#F87171";

type Nav = NativeStackNavigationProp<AuthStackParamList, "OtpVerification">;
type RouteT = RouteProp<AuthStackParamList, "OtpVerification">;

function formatMmSs(total: number): string {
  const m = Math.floor(Math.max(0, total) / 60);
  const s = Math.max(0, total) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function OtpVerification() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {
    email,
    purpose = "SignupEmail" as OtpPurpose,
    devOtp,
  } = useRoute<RouteT>().params;

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [expiresIn, setExpiresIn] = useState(EXPIRY_SECONDS);
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SECONDS);

  const inputs = useRef<Array<TextInput | null>>([]);
  const shake = useRef(new Animated.Value(0)).current;

  // Countdown timers — one real interval, both counters decrement off it.
  useEffect(() => {
    const t = setInterval(() => {
      setExpiresIn((v) => (v > 0 ? v - 1 : 0));
      setResendIn((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-focus first box on mount.
  useEffect(() => {
    const t = setTimeout(() => inputs.current[0]?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  // Dev-only convenience: prefill if the backend returned the OTP in dev mode.
  useEffect(() => {
    if (devOtp && devOtp.length === OTP_LENGTH) {
      setDigits(devOtp.split(""));
    }
  }, [devOtp]);

  const code = useMemo(() => digits.join(""), [digits]);
  const filled = code.length === OTP_LENGTH;
  const expired = expiresIn === 0;

  const shakeError = useCallback(() => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true, easing: Easing.linear }),
    ]).start();
  }, [shake]);

  const handleDigitChange = (index: number, value: string) => {
    // Paste: user may paste the full 6-digit code into any box. Distribute it.
    const sanitized = value.replace(/\D/g, "");
    if (sanitized.length > 1) {
      const spread = sanitized.slice(0, OTP_LENGTH).split("");
      setDigits((prev) => {
        const next = [...prev];
        for (let i = 0; i < OTP_LENGTH; i++) {
          const ch = spread[i];
          if (ch !== undefined) next[i] = ch;
        }
        return next;
      });
      const lastIndex = Math.min(spread.length, OTP_LENGTH) - 1;
      inputs.current[Math.min(OTP_LENGTH - 1, lastIndex + 1)]?.focus();
      setError(null);
      return;
    }

    setDigits((prev) => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });
    setError(null);
    if (sanitized && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace") {
      setDigits((prev) => {
        const next = [...prev];
        if (next[index]) {
          next[index] = "";
        } else if (index > 0) {
          next[index - 1] = "";
          inputs.current[index - 1]?.focus();
        }
        return next;
      });
    }
  };

  const submit = useCallback(async () => {
    if (submitting) return;
    if (!filled) {
      setError("Enter the full 6-digit code.");
      shakeError();
      return;
    }
    if (expired) {
      setError("This code has expired. Tap Resend to get a new one.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await verifyOtp(email, code, purpose);
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data ??
        err?.message ??
        "Verification failed.";
      setError(typeof msg === "string" ? msg : "Verification failed.");
      shakeError();
    } finally {
      setSubmitting(false);
    }
  }, [submitting, filled, expired, email, code, purpose, navigation, shakeError]);

  // Auto-verify as soon as the last box is filled — feels instant.
  useEffect(() => {
    if (filled && !submitting && !expired) {
      submit();
    }
    // We intentionally want this only to fire on transition to "filled".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled]);

  const resend = async () => {
    if (resending || resendIn > 0) return;
    setResending(true);
    setError(null);
    try {
      const res = await sendOtp(email, purpose);
      setExpiresIn(EXPIRY_SECONDS);
      setResendIn(RESEND_COOLDOWN_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputs.current[0]?.focus();
      if (res.devOtp) setDigits(res.devOtp.split(""));
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        "Could not resend code.";
      setError(typeof msg === "string" ? msg : "Could not resend code.");
    } finally {
      setResending(false);
    }
  };

  const shakeTranslate = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-8, 8],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <LinearGradient
        colors={[GREEN_MID, GREEN, GREEN_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 14 }]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={styles.back}
        >
          <Feather name="chevron-left" size={22} color="white" />
        </Pressable>
        <Text style={styles.headerEyebrow}>VERIFY EMAIL</Text>
        <Text style={styles.headerTitle}>Enter your 6-digit code</Text>
        <Text style={styles.headerSub}>
          We sent a code to{" "}
          <Text style={{ color: "white", fontWeight: "800" }}>{email}</Text>
        </Text>
      </LinearGradient>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        <Animated.View
          style={[
            styles.boxesRow,
            { transform: [{ translateX: shakeTranslate }] },
          ]}
        >
          {digits.map((d, i) => {
            const active = d !== "";
            const focused = i === digits.findIndex((x) => x === "");
            return (
              <View
                key={i}
                style={[
                  styles.box,
                  active && styles.boxActive,
                  focused && !active && styles.boxFocused,
                  error && styles.boxError,
                ]}
              >
                <TextInput
                  ref={(r) => {
                    inputs.current[i] = r;
                  }}
                  style={styles.boxInput}
                  value={d}
                  onChangeText={(v) => handleDigitChange(i, v)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(i, nativeEvent.key)
                  }
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                  textContentType={Platform.OS === "ios" ? "oneTimeCode" : undefined}
                  autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
                  selectionColor={ACCENT}
                  caretHidden
                  returnKeyType={i === OTP_LENGTH - 1 ? "done" : "next"}
                />
              </View>
            );
          })}
        </Animated.View>

        {error ? (
          <View style={styles.errorRow}>
            <Feather name="alert-circle" size={14} color={DANGER} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.timerRow}>
            <MaterialIcons
              name={expired ? "timer-off" : "timer"}
              size={14}
              color={expired ? DANGER : DIM}
            />
            <Text
              style={[styles.timerText, expired && { color: DANGER }]}
            >
              {expired
                ? "Code expired"
                : `Expires in ${formatMmSs(expiresIn)}`}
            </Text>
          </View>
        )}

        <Pressable
          onPress={submit}
          disabled={submitting || expired}
          style={({ pressed }) => [
            styles.submitWrap,
            {
              opacity: submitting || expired ? 0.6 : 1,
              transform: [{ scale: pressed && !submitting && !expired ? 0.98 : 1 }],
            },
          ]}
        >
          <LinearGradient
            colors={[ACCENT, "#16A34A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.submit}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.submitText}>Verify</Text>
                <Feather name="arrow-right" size={18} color="white" />
              </>
            )}
          </LinearGradient>
        </Pressable>

        <View style={styles.resendRow}>
          <Text style={styles.resendPrompt}>Didn't get it?</Text>
          <Pressable
            onPress={resend}
            disabled={resending || resendIn > 0}
            hitSlop={6}
          >
            <Text
              style={[
                styles.resendLink,
                (resending || resendIn > 0) && { color: MUTED, opacity: 0.7 },
              ]}
            >
              {resending
                ? "Sending…"
                : resendIn > 0
                  ? `Resend in ${formatMmSs(resendIn)}`
                  : "Resend code"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#052E16" },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 26,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  headerEyebrow: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  headerTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSub: {
    color: MUTED,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },

  scroll: {
    padding: 20,
    gap: 16,
  },

  boxesRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 8,
  },
  box: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    maxHeight: 64,
    // Small floating feel
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  boxActive: {
    borderColor: ACCENT,
    backgroundColor: CARD_ALT,
  },
  boxFocused: {
    borderColor: ACCENT,
  },
  boxError: {
    borderColor: DANGER,
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  boxInput: {
    width: "100%",
    height: "100%",
    textAlign: "center",
    color: TEXT,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
    padding: 0,
  },

  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  timerText: {
    color: DIM,
    fontSize: 12,
    fontWeight: "700",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  errorText: {
    color: DANGER,
    fontSize: 12,
    fontWeight: "700",
  },

  submitWrap: {
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  submitText: {
    color: "white",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  resendRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  resendPrompt: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
  },
  resendLink: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: "800",
  },
});
