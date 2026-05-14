import { View, Text } from "react-native";
import type { TransactionStatus } from "@/types/wallet";

const STATUS_STYLE: Record<
  TransactionStatus,
  { bg: string; text: string; dot: string }
> = {
  Success: { bg: "rgba(34,197,94,0.16)",  text: "#86EFAC", dot: "#22C55E" },
  Pending: { bg: "rgba(245,158,11,0.16)", text: "#FCD34D", dot: "#F59E0B" },
  Failed:  { bg: "rgba(239,68,68,0.16)",  text: "#FCA5A5", dot: "#EF4444" },
};

export default function StatusPill({ status }: { status: TransactionStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: s.bg,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: s.dot,
          marginRight: 5,
        }}
      />
      <Text
        style={{
          color: s.text,
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.4,
        }}
      >
        {status.toUpperCase()}
      </Text>
    </View>
  );
}
