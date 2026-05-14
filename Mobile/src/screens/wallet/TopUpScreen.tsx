import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { COLORS } from "@/theme/colors";
import { topUpWallet } from "@/api/api";
import { useHideFab } from "@/components/FabVisibility";
import AmountChip from "./components/AmountChip";

type AnyNav = NativeStackNavigationProp<any>;

const QUICK_AMOUNTS = [200, 500, 1000, 2000, 5000];
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 1_000_000;

type Phase =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "success"; amount: number; newBalance: number; referenceId: string }
  | { kind: "failure"; amount: number; reason: string };

// Cheap UUID without pulling a dep — collision risk is fine for an
// idempotency token that's only meaningful within a single user's window.
function newIdempotencyKey(): string {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

function fmt(amount: number) {
  return amount.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TopUpScreen() {
  const nav = useNavigation<AnyNav>();
  const insets = useSafeAreaInsets();

  // ⚠️  All hooks MUST be called before any conditional return below
  //     (rules-of-hooks). Adding a hook after the success/failure early
  //     returns triggers a "Rendered fewer hooks than expected" crash
  //     the moment `phase` flips from form → success/failure.
  useHideFab();

  const [amount, setAmount]    = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [phase, setPhase]      = useState<Phase>({ kind: "form" });

  // One key per "attempt" — generated fresh on mount + after failure.
  // Prevents the API double-charging if the user mashes Confirm or the
  // network retries silently mid-flight.
  const idemKey = useRef(newIdempotencyKey());
  const inFlight = useRef(false);

  const numeric = Number(amount);
  const valid =
    Number.isFinite(numeric) &&
    numeric >= MIN_AMOUNT &&
    numeric <= MAX_AMOUNT;

  // Live validation — clear stale errors as the user fixes input.
  useEffect(() => {
    if (amount === "") {
      setErrorMsg(null);
      return;
    }
    if (!Number.isFinite(numeric)) {
      setErrorMsg("Enter a valid number.");
      return;
    }
    if (numeric < MIN_AMOUNT) {
      setErrorMsg(`Minimum top-up is Rs. ${MIN_AMOUNT}.`);
      return;
    }
    if (numeric > MAX_AMOUNT) {
      setErrorMsg(`Maximum top-up is Rs. ${MAX_AMOUNT.toLocaleString()}.`);
      return;
    }
    setErrorMsg(null);
  }, [amount, numeric]);

  const submit = async () => {
    if (amount === "") {
      setErrorMsg("Please enter an amount.");
      return;
    }
    if (!valid) {
      // errorMsg is already populated by the effect above
      return;
    }
    if (inFlight.current) return; // duplicate-tap guard
    inFlight.current = true;
    setPhase({ kind: "submitting" });

    try {
      const res = await topUpWallet(numeric, idemKey.current);
      if (res.status !== "Success") {
        setPhase({
          kind: "failure",
          amount: numeric,
          reason: res.message || "Payment was not completed.",
        });
        return;
      }
      setPhase({
        kind: "success",
        amount: numeric,
        newBalance: res.newBalance,
        referenceId: res.referenceId,
      });
    } catch (err: any) {
      const reason =
        err?.response?.data?.message ??
        err?.message ??
        "We couldn't reach the payment service. Check your connection and try again.";
      setPhase({ kind: "failure", amount: numeric, reason });
    } finally {
      inFlight.current = false;
    }
  };

  const retry = () => {
    // Fresh idempotency key — this is a new attempt, not a retry of the
    // same "logical" charge. A retry of the same key would short-circuit
    // to the original failure on the server.
    idemKey.current = newIdempotencyKey();
    setPhase({ kind: "form" });
  };

  // ── Branches ─────────────────────────────────────────────────────────────
  if (phase.kind === "success") {
    return (
      <SuccessView
        amount={phase.amount}
        newBalance={phase.newBalance}
        referenceId={phase.referenceId}
        onDone={() => nav.goBack()}
      />
    );
  }

  if (phase.kind === "failure") {
    return (
      <FailureView
        amount={phase.amount}
        reason={phase.reason}
        onRetry={retry}
        onCancel={() => nav.goBack()}
      />
    );
  }

  const submitting = phase.kind === "submitting";

  // Layout: a flat flex column. Header → ScrollView (flex:1) → Footer.
  // KeyboardAvoidingView lifts the whole stack on iOS; Android's adjustResize
  // shrinks the view automatically. The Footer is the LAST child of the
  // KeyboardAvoidingView, so it always sits at the bottom of the visible
  // area — keyboard open or closed.
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 18,
          paddingBottom: 14,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={() => nav.goBack()}
          disabled={submitting}
          hitSlop={14}
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <MaterialIcons name="arrow-back" size={20} color={COLORS.textLight} />
        </Pressable>
        <View>
          <Text
            style={{
              color: COLORS.textLight,
              fontSize: 22,
              fontWeight: "800",
              letterSpacing: 0.2,
            }}
          >
            Top Up Wallet
          </Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
            Add funds to pay for rides
          </Text>
        </View>
      </View>

      {/* ── Scrollable middle ──────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 4,
          paddingBottom: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 22,
            padding: 18,
            borderWidth: 1,
            borderColor: COLORS.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.22,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Text
            style={{
              color: COLORS.textMuted,
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Amount
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: COLORS.cardAlt,
              borderRadius: 16,
              paddingHorizontal: 16,
              borderWidth: 1.5,
              borderColor: errorMsg ? "#EF4444" : COLORS.border,
            }}
          >
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 18,
                fontWeight: "700",
                marginRight: 8,
              }}
            >
              Rs.
            </Text>
            <TextInput
              value={amount}
              onChangeText={(v) => {
                const cleaned = v.replace(/[^0-9]/g, "");
                setAmount(cleaned);
              }}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={COLORS.textDim}
              editable={!submitting}
              maxLength={7}
              returnKeyType="done"
              style={{
                flex: 1,
                color: COLORS.textLight,
                fontSize: 30,
                fontWeight: "800",
                paddingVertical: 16,
                fontVariant: ["tabular-nums"],
                letterSpacing: 0.3,
              }}
            />
          </View>

          {/* Validation row — fixed minHeight so layout doesn't jump */}
          <View style={{ minHeight: 18, marginTop: 8 }}>
            {errorMsg ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialIcons
                  name="error-outline"
                  size={14}
                  color="#FCA5A5"
                />
                <Text
                  style={{
                    color: "#FCA5A5",
                    fontSize: 12,
                    fontWeight: "600",
                    marginLeft: 4,
                  }}
                >
                  {errorMsg}
                </Text>
              </View>
            ) : (
              <Text style={{ color: COLORS.textDim, fontSize: 11 }}>
                Min Rs. {MIN_AMOUNT} · Max Rs.{" "}
                {MAX_AMOUNT.toLocaleString()}
              </Text>
            )}
          </View>

          <Text
            style={{
              color: COLORS.textMuted,
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginTop: 14,
              marginBottom: 10,
            }}
          >
            Quick Amounts
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {QUICK_AMOUNTS.map((q) => (
              <AmountChip
                key={q}
                amount={q}
                selected={numeric === q}
                disabled={submitting}
                onPress={(a) => setAmount(String(a))}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky footer: last child of KAV, ALWAYS visible ──────────────
          Uses TouchableOpacity (rock-solid on iOS) with static StyleSheet
          styles — no function-style Pressable that has been giving us
          render glitches. The button's visual state is driven purely by
          `disabled`'s built-in opacity behavior, so there's nothing left
          for React Native to bail out of computing. */}
      <View style={confirmStyles.footer(insets.bottom)}>
        <TouchableOpacity
          onPress={submit}
          disabled={submitting || !valid}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{
            disabled: !valid || submitting,
            busy: submitting,
          }}
          style={[
            confirmStyles.btn,
            !valid && confirmStyles.btnDisabled,
          ]}
        >
          {submitting ? (
            <>
              <ActivityIndicator color="#052e16" />
              <Text style={confirmStyles.btnLabel}>
                {"  "}Processing payment…
              </Text>
            </>
          ) : (
            <Text style={confirmStyles.btnLabel} numberOfLines={1}>
              {valid
                ? `Confirm Top-Up · Rs. ${fmt(numeric)}`
                : "Enter at least Rs. 100"}
            </Text>
          )}
        </TouchableOpacity>

        <View style={confirmStyles.helperRow}>
          <MaterialIcons name="lock-outline" size={13} color={COLORS.textDim} />
          <Text style={confirmStyles.helperText}>
            Demo Mode — Payments are simulated for testing purposes
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// Static styles for the sticky-footer button. Keeping the computed values
// out of inline JSX is what made the Pressable render reliably — RN's
// reconciler no longer recomputes a fresh style object on every keystroke.
const confirmStyles = {
  footer: (bottomInset: number) =>
    StyleSheet.flatten({
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: bottomInset + 12,
      backgroundColor: COLORS.bg,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 16,
    }),
  btn: {
    height: 56,
    backgroundColor: COLORS.accent, // ← always bright green; disabled handled by overlay style
    borderRadius: 999,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 20,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  btnDisabled: {
    backgroundColor: COLORS.cardAlt,
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.85,
  },
  btnLabel: {
    color: "#052e16",
    fontWeight: "800" as const,
    fontSize: 15.5,
    letterSpacing: 0.3,
  },
  helperRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 10,
  },
  helperText: {
    color: COLORS.textDim,
    fontSize: 11,
    marginLeft: 4,
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Success
// ────────────────────────────────────────────────────────────────────────────
function SuccessView({
  amount,
  newBalance,
  referenceId,
  onDone,
}: {
  amount: number;
  newBalance: number;
  referenceId: string;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();

  // Spring + tick stroke reveal.
  const tickScale  = useSharedValue(0);
  const ringScale  = useSharedValue(0.7);
  const cardOpacity = useSharedValue(0);
  const cardLift    = useSharedValue(20);

  useEffect(() => {
    ringScale.value = withSpring(1, { damping: 10, stiffness: 120 });
    tickScale.value = withSpring(1, { damping: 8, stiffness: 140, mass: 0.6 });
    cardOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) });
    cardLift.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) });
  }, [ringScale, tickScale, cardOpacity, cardLift]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));
  const tickStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tickScale.value }],
    opacity: tickScale.value,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardLift.value }],
  }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
      }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[
          {
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "rgba(34,197,94,0.12)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "rgba(34,197,94,0.4)",
          },
          ringStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: COLORS.accent,
              alignItems: "center",
              justifyContent: "center",
            },
            tickStyle,
          ]}
        >
          <MaterialIcons name="check" size={48} color="#052e16" />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[{ width: "100%", alignItems: "center" }, cardStyle]}>
        <Text
          style={{
            color: COLORS.textLight,
            fontSize: 24,
            fontWeight: "800",
            marginTop: 22,
            letterSpacing: 0.2,
          }}
        >
          Top-Up Successful
        </Text>
        <Text
          style={{
            color: COLORS.textMuted,
            fontSize: 14,
            marginTop: 4,
          }}
        >
          Rs. {fmt(amount)} added to your wallet
        </Text>

        <View
          style={{
            marginTop: 28,
            backgroundColor: COLORS.card,
            padding: 18,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: COLORS.border,
            width: "100%",
            maxWidth: 380,
          }}
        >
          <Row label="Amount Added" value={`Rs. ${fmt(amount)}`} />
          <Divider />
          <Row label="New Balance" value={`Rs. ${fmt(newBalance)}`} bold />
          <Divider />
          <Row
            label="Reference"
            value={referenceId}
            mono
            valueStyle={{ fontSize: 11 }}
          />
        </View>

        {/* TouchableOpacity + static styles — same fix that made the
            Confirm button render reliably on iOS. */}
        <TouchableOpacity
          onPress={onDone}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Back to Wallet"
          style={successStyles.btn}
        >
          <MaterialIcons
            name="account-balance-wallet"
            size={18}
            color="#052e16"
          />
          <Text style={successStyles.btnLabel}>Back to Wallet</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Failure
// ────────────────────────────────────────────────────────────────────────────
function FailureView({
  amount,
  reason,
  onRetry,
  onCancel,
}: {
  amount: number;
  reason: string;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const ring = useSharedValue(0.7);

  useEffect(() => {
    ring.value = withSpring(1, { damping: 10, stiffness: 120 });
  }, [ring]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
  }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
      }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[
          {
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "rgba(239,68,68,0.12)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "rgba(239,68,68,0.45)",
          },
          ringStyle,
        ]}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "#EF4444",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="close" size={48} color="#fff" />
        </View>
      </Animated.View>

      <Text
        style={{
          color: COLORS.textLight,
          fontSize: 24,
          fontWeight: "800",
          marginTop: 22,
          letterSpacing: 0.2,
        }}
      >
        Top-Up Failed
      </Text>
      <Text
        style={{
          color: COLORS.textMuted,
          fontSize: 14,
          marginTop: 4,
        }}
      >
        Rs. {fmt(amount)} was not charged
      </Text>

      <View
        style={{
          marginTop: 22,
          backgroundColor: COLORS.card,
          padding: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(239,68,68,0.35)",
          width: "100%",
          maxWidth: 380,
          flexDirection: "row",
          alignItems: "flex-start",
        }}
      >
        <MaterialIcons
          name="info-outline"
          size={18}
          color="#FCA5A5"
          style={{ marginRight: 10, marginTop: 1 }}
        />
        <Text
          style={{
            color: "#FCA5A5",
            fontSize: 13,
            lineHeight: 19,
            flex: 1,
          }}
        >
          {reason}
        </Text>
      </View>

      <View
        style={{
          marginTop: 28,
          width: "100%",
          maxWidth: 380,
          gap: 10,
        }}
      >
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.85}
          accessibilityRole="button"
          style={failStyles.tryAgain}
        >
          <Text style={failStyles.tryAgainLabel}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onCancel}
          activeOpacity={0.6}
          accessibilityRole="button"
          style={failStyles.cancel}
        >
          <Text style={failStyles.cancelLabel}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Static styles for the success/failure end-state buttons. Same lesson
// learned on the Confirm button: no function-style props on iOS Pressable
// when the surrounding component re-renders rapidly.
const successStyles = {
  btn: {
    marginTop: 28,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  btnLabel: {
    color: "#052e16",
    fontWeight: "800" as const,
    fontSize: 15,
    marginLeft: 8,
    letterSpacing: 0.3,
  },
};

const failStyles = {
  tryAgain: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center" as const,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  tryAgainLabel: {
    color: "#052e16",
    fontWeight: "800" as const,
    fontSize: 15,
  },
  cancel: {
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center" as const,
  },
  cancelLabel: {
    color: COLORS.textMuted,
    fontWeight: "700" as const,
    fontSize: 14,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function Row({
  label,
  value,
  bold,
  mono,
  valueStyle,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
  valueStyle?: object;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>{label}</Text>
      <Text
        style={[
          {
            color: COLORS.textLight,
            fontSize: bold ? 18 : 14,
            fontWeight: bold ? "800" : "700",
            fontVariant: ["tabular-nums"],
          },
          mono ? { fontFamily: "monospace" } : null,
          valueStyle ?? {},
        ]}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: COLORS.border,
        opacity: 0.6,
        marginVertical: 6,
      }}
    />
  );
}
