import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { COLORS } from "@/theme/colors";

type Props = {
  balance: number | null;
  updatedAt?: string;
  onTopUp: () => void;
};

function formatPkr(amount: number) {
  return amount.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatUpdated(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-PK", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function BalanceCard({ balance, updatedAt, onTopUp }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <LinearGradient
      colors={["#14532D", "#166534", "#22C55E"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 24,
        padding: 22,
        shadowColor: "#22C55E",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: 13,
            fontWeight: "600",
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          Available Balance
        </Text>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "rgba(255,255,255,0.18)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="account-balance-wallet" size={18} color="#fff" />
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          marginTop: 12,
        }}
      >
        <Text
          style={{
            color: "#ECFDF5",
            fontSize: 16,
            fontWeight: "700",
            marginRight: 6,
            opacity: 0.9,
          }}
        >
          Rs.
        </Text>
        <Text
          style={{
            color: "#fff",
            fontSize: 38,
            fontWeight: "800",
            letterSpacing: 0.3,
            fontVariant: ["tabular-nums"],
          }}
        >
          {balance == null ? "—" : formatPkr(balance)}
        </Text>
      </View>

      {updatedAt && (
        <Text
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 11,
            marginTop: 4,
          }}
        >
          Updated {formatUpdated(updatedAt)}
        </Text>
      )}

      <Animated.View style={[animated, { marginTop: 18 }]}>
        <Pressable
          onPressIn={() => {
            scale.value = withSpring(0.97, { damping: 14, stiffness: 220 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 14, stiffness: 220 });
          }}
          onPress={onTopUp}
          style={{
            backgroundColor: COLORS.accent,
            paddingVertical: 13,
            borderRadius: 999,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <MaterialIcons name="add" size={20} color="#052e16" />
          <Text
            style={{
              marginLeft: 6,
              color: "#052e16",
              fontWeight: "800",
              fontSize: 15,
              letterSpacing: 0.3,
            }}
          >
            Top Up Wallet
          </Text>
        </Pressable>
      </Animated.View>
    </LinearGradient>
  );
}
