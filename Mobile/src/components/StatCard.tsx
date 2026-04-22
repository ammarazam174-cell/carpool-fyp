import { Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "@/theme/colors";

type MDIconName = React.ComponentProps<typeof MaterialIcons>["name"];

type Props = {
  icon: MDIconName;
  label: string;
  value: string;
  accent: string;
};

export default function StatCard({ icon, label, value, accent }: Props) {
  return (
    <View
      style={{
        flexBasis: "47%",
        flexGrow: 1,
        backgroundColor: COLORS.card,
        borderRadius: 18,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        borderLeftWidth: 4,
        borderLeftColor: accent,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
        elevation: 5,
      }}
    >
      {/* subtle accent tint wash */}
      <View
        pointerEvents="none"
        style={{
          ...StyleAbsFill,
          backgroundColor: `${accent}12`,
        }}
      />
      <View
        style={{
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            backgroundColor: `${accent}26`,
            borderWidth: 1,
            borderColor: `${accent}40`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name={icon} size={22} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: COLORS.textMuted,
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 0.5,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Text
            style={{
              color: COLORS.textLight,
              fontSize: 18,
              fontWeight: "800",
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
}

const StyleAbsFill = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
