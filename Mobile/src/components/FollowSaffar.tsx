import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "@/theme/colors";

type FAName = React.ComponentProps<typeof FontAwesome5>["name"];

type Network = {
  key: string;
  label: string;
  icon: FAName;
  url: string;
  /** Solid brand color used when no gradient is supplied. Also used for the
   *  ambient shadow "glow" below the tile. */
  tint: string;
  /** Optional brand gradient (Instagram). Two stops is enough for a premium
   *  feel without the cost of extra color stops. */
  gradient?: readonly [string, string, ...string[]];
};

const NETWORKS: readonly Network[] = [
  {
    key: "facebook",
    label: "Facebook",
    icon: "facebook-f",
    url: "https://www.facebook.com/saffar.pk",
    tint: "#1877F2",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: "instagram",
    url: "https://www.instagram.com/saffarpk/",
    tint: "#E4405F",
    gradient: ["#833AB4", "#E1306C", "#FCAF45"] as const,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: "linkedin-in",
    url: "https://www.linkedin.com/company/saffarpk/",
    tint: "#0A66C2",
  },
];

interface Props {
  style?: StyleProp<ViewStyle>;
  /** Optional override for the section heading (defaults to "Follow Saffar"). */
  title?: string;
  /** Optional override for the subtitle under the heading. */
  subtitle?: string;
}

export default function FollowSaffar({
  style,
  title = "Follow Saffar",
  subtitle = "Stay updated with new routes & offers",
}: Props) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.row}>
        {NETWORKS.map((n) => (
          <SocialTile key={n.key} network={n} />
        ))}
      </View>
    </View>
  );
}

function SocialTile({ network }: { network: Network }) {
  const open = async () => {
    try {
      const supported = await Linking.canOpenURL(network.url);
      if (!supported) {
        Alert.alert("Unable to open", `Couldn't open ${network.label}.`);
        return;
      }
      await Linking.openURL(network.url);
    } catch {
      Alert.alert("Unable to open", `Couldn't open ${network.label}.`);
    }
  };

  const tileStyle = ({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> => [
    styles.tile,
    {
      // Platform-specific colored glow. iOS shadow* + Android elevation.
      shadowColor: network.tint,
      transform: [{ scale: pressed ? 0.94 : 1 }],
      opacity: pressed ? 0.9 : 1,
    },
  ];

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open ${network.label}`}
      onPress={open}
      android_ripple={{
        color: "rgba(255,255,255,0.18)",
        radius: 40,
        borderless: true,
      }}
      style={tileStyle}
      hitSlop={6}
    >
      {network.gradient ? (
        <LinearGradient
          colors={network.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.badge}
        >
          <FontAwesome5 name={network.icon} size={22} color="#fff" />
        </LinearGradient>
      ) : (
        <View style={[styles.badge, { backgroundColor: network.tint }]}>
          <FontAwesome5 name={network.icon} size={22} color="#fff" />
        </View>
      )}
      <Text style={styles.label} numberOfLines={1}>
        {network.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    // Ambient card shadow — sits above the page.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 7,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  row: {
    flexDirection: "row",
    // Equal spacing regardless of label length — each tile takes 1/3rd.
    gap: 12,
  },
  tile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    // Colored brand glow; matches tint from the Network entry at render time.
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  badge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    // Soft inner highlight so flat brand colors still feel dimensional.
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  label: {
    color: COLORS.textLight,
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
