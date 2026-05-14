import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { useFabVisibility } from "@/components/FabVisibility";

// ─── Config ────────────────────────────────────────────────────────────────
// International format, no leading + and no spaces. Override via prop if the
// support line changes per deployment.
const DEFAULT_SUPPORT_PHONE = "923158818206";
const BRAND_NAME = "Saffar";
const BRAND_GREEN = "#25D366";
const BRAND_GREEN_DARK = "#128C7E";
const TOOLTIP_SHOW_DELAY_MS = 400;
const TOOLTIP_VISIBLE_MS = 3500;
const PULSE_PERIOD_MS = 1600;
const PULSE_REST_MS = 1600;

// Working hours: 09:00–22:00 local time. Outside this window we append a
// disclaimer to the pre-filled message so passengers aren't left wondering
// why support hasn't replied.
function isAfterHours(now: Date = new Date()): boolean {
  const h = now.getHours();
  return h < 9 || h >= 22;
}

function buildMessage(opts: {
  userName?: string | null;
  context?: string;
  afterHours: boolean;
}): string {
  const { userName, context, afterHours } = opts;
  const lines: string[] = [`Hi ${BRAND_NAME} Support,`];
  if (userName?.trim()) lines.push(`User: ${userName.trim()}`);
  lines.push(context?.trim() || "I need help regarding my ride.");
  if (afterHours) {
    lines.push(
      "",
      "(I contacted outside working hours. Please respond when available.)"
    );
  }
  return lines.join("\n");
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface Props {
  /** E.164 digits only, e.g. "923001234567". Do not include `+`. */
  phone?: string;
  /** Pre-fills the second line of the message (overrides default). */
  context?: string;
  /** Override the user name shown in the message. Defaults to logged-in user. */
  userName?: string;
  /** Hide the button (e.g. during a fullscreen map/camera/onboarding flow). */
  visible?: boolean;
  /** Extra pixels above the bottom safe-area inset. Defaults to 90 so the FAB
   *  clears the tab bar on DriverTabs / PassengerTabs. */
  offsetBottom?: number;
}

// ───────────────────────────────────────────────────────────────────────────
export default function WhatsAppFab({
  phone = DEFAULT_SUPPORT_PHONE,
  context,
  userName,
  visible = true,
  offsetBottom = 90,
}: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { hidden } = useFabVisibility();
  const effectiveUserName = userName ?? user?.fullName ?? null;

  // Entry animation + halo pulse + one-shot tooltip.
  const fade = useRef(new Animated.Value(0)).current;
  const mountScale = useRef(new Animated.Value(0.6)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const [tooltipMounted, setTooltipMounted] = useState(true);

  useEffect(() => {
    // Entry: fade + spring-scale in.
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.spring(mountScale, {
        toValue: 1,
        friction: 5,
        tension: 110,
        useNativeDriver: true,
      }),
    ]).start();

    // Halo pulse — expanding ring behind the button. A subtle loop with a
    // rest beat so it doesn't feel frantic. `useNativeDriver` keeps it off
    // the JS thread.
    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, {
          toValue: 1,
          duration: PULSE_PERIOD_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(halo, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(PULSE_REST_MS),
      ])
    );
    haloLoop.start();

    // Tooltip: fade in shortly after mount, dwell, fade out.
    const tooltipSeq = Animated.sequence([
      Animated.delay(TOOLTIP_SHOW_DELAY_MS),
      Animated.timing(tooltipOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.delay(TOOLTIP_VISIBLE_MS),
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 360,
        useNativeDriver: true,
      }),
    ]);
    tooltipSeq.start(({ finished }) => {
      if (finished) setTooltipMounted(false);
    });

    return () => {
      haloLoop.stop();
      tooltipSeq.stop();
    };
  }, [fade, mountScale, halo, tooltipOpacity]);

  const haloScale = halo.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });
  const haloAlpha = halo.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0],
  });

  const openChat = async () => {
    // Dismiss the tooltip on first interaction so it doesn't replay on back-nav
    // to this mount.
    Animated.timing(tooltipOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setTooltipMounted(false));

    const afterHours = isAfterHours();
    const message = buildMessage({
      userName: effectiveUserName,
      context,
      afterHours,
    });
    const encoded = encodeURIComponent(message);
    const appUrl = `whatsapp://send?phone=${phone}&text=${encoded}`;
    const webUrl = `https://wa.me/${phone}?text=${encoded}`;

    try {
      const supported = await Linking.canOpenURL(appUrl);
      await Linking.openURL(supported ? appUrl : webUrl);
    } catch {
      try {
        await Linking.openURL(webUrl);
      } catch {
        Alert.alert(
          "WhatsApp unavailable",
          "We couldn't open WhatsApp. Please install it or try again later."
        );
      }
    }
  };

  if (!visible) return null;
  // Screens that can't tolerate the floating button overlapping their
  // primary CTA (payment screens, etc.) hide it via useHideFab().
  if (hidden) return null;

  return (
    <Animated.View
      // Don't block touches on anything outside the actual button footprint.
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          bottom: offsetBottom + insets.bottom,
          opacity: fade,
          transform: [{ scale: mountScale }],
        },
      ]}
    >
      {tooltipMounted ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.tooltip, { opacity: tooltipOpacity }]}
        >
          <Text style={styles.tooltipText}>Chat with Support</Text>
          <View style={styles.tooltipArrow} />
        </Animated.View>
      ) : null}

      <View style={styles.fabWrap}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            { transform: [{ scale: haloScale }], opacity: haloAlpha },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chat with Saffar Support on WhatsApp"
          hitSlop={8}
          onPress={openChat}
          android_ripple={{
            color: "rgba(255,255,255,0.22)",
            radius: 36,
            borderless: true,
          }}
          style={({ pressed }) => [
            styles.fab,
            { transform: [{ scale: pressed ? 0.94 : 1 }] },
          ]}
        >
          <FontAwesome5 name="whatsapp" size={28} color="#fff" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const FAB_SIZE = 58;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 16,
    alignItems: "flex-end",
    // Above the tab bar, below modals. Modals in RN render in their own
    // window so they naturally eclipse this without extra work.
    zIndex: 999,
  },
  fabWrap: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: BRAND_GREEN,
    alignItems: "center",
    justifyContent: "center",
    // Colored glow — subtle on Android via elevation, prominent on iOS
    // via a green shadow that matches the brand.
    shadowColor: BRAND_GREEN_DARK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
    // Inner highlight so the flat brand green feels dimensional.
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  halo: {
    position: "absolute",
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: BRAND_GREEN,
    // The halo is behind the FAB. Without zIndex, `position:absolute` siblings
    // order by render; rendering the halo first in JSX places it beneath.
  },
  tooltip: {
    marginBottom: 10,
    marginRight: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  tooltipText: {
    backgroundColor: "rgba(17,24,39,0.94)",
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: 0.2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    // Keep it readable on any background — avoid pure white which clashes
    // with the dark-green driver theme.
    ...Platform.select({ web: { userSelect: "none" } }),
  },
  tooltipArrow: {
    // Right-pointing triangle using border tricks — same technique used by
    // every RN speech-bubble. 0×0 view with one solid-color border side.
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 8,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "rgba(17,24,39,0.94)",
    marginLeft: -1,
    marginRight: 2,
  },
});
