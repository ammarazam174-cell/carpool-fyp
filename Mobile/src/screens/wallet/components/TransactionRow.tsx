import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { COLORS } from "@/theme/colors";
import type { Transaction, TransactionType } from "@/types/wallet";
import StatusPill from "./StatusPill";

type Props = { txn: Transaction };

const TYPE_LABEL: Record<TransactionType, string> = {
  TopUp:         "Wallet Top-Up",
  RidePayment:   "Ride Payment",
  DriverEarning: "Ride Earning",
  Refund:        "Refund",
};

const TYPE_ICON: Record<
  TransactionType,
  React.ComponentProps<typeof MaterialIcons>["name"]
> = {
  TopUp:         "arrow-downward",
  RidePayment:   "arrow-upward",
  DriverEarning: "arrow-downward",
  Refund:        "undo",
};

function formatPkr(amount: number) {
  const sign = amount < 0 ? "-" : "+";
  const abs = Math.abs(amount);
  return `${sign} Rs. ${abs.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return d.toLocaleString("en-PK", sameDay
    ? { hour: "numeric", minute: "2-digit" }
    : { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }
  );
}

export default function TransactionRow({ txn }: Props) {
  const isCredit = txn.amount > 0;
  const accent = isCredit ? "#86EFAC" : "#FCA5A5";
  const iconBg = isCredit ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)";

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const refTail = txn.referenceId
    ? `· ${txn.referenceId.slice(-8)}`
    : "";

  return (
    <Animated.View style={[animatedStyle, { marginBottom: 10 }]}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.985, { damping: 16, stiffness: 240 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 240 });
        }}
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          backgroundColor: COLORS.card,
          borderRadius: 16,
          padding: 13,
          borderWidth: 1,
          borderColor: COLORS.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 6,
          elevation: 3,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: iconBg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <MaterialIcons name={TYPE_ICON[txn.type]} size={20} color={accent} />
        </View>

        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: COLORS.textLight,
                fontSize: 14.5,
                fontWeight: "700",
                flex: 1,
              }}
              numberOfLines={1}
            >
              {TYPE_LABEL[txn.type] ?? txn.type}
            </Text>
            <Text
              style={{
                color: accent,
                fontWeight: "800",
                fontSize: 15,
                marginLeft: 8,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatPkr(txn.amount)}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 6,
            }}
          >
            <Text
              style={{ color: COLORS.textMuted, fontSize: 11 }}
              numberOfLines={1}
            >
              {formatDate(txn.createdAt)} {refTail}
            </Text>
            <StatusPill status={txn.status} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
