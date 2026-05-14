import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "@/theme/colors";

export default function EmptyState({
  icon = "receipt-long",
  title,
  message,
}: {
  icon?: React.ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  message: string;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 36,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: COLORS.cardAlt,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <MaterialIcons name={icon} size={36} color={COLORS.textDim} />
      </View>
      <Text
        style={{
          color: COLORS.textLight,
          fontSize: 15,
          fontWeight: "700",
          marginTop: 14,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: COLORS.textMuted,
          fontSize: 13,
          textAlign: "center",
          marginTop: 4,
          paddingHorizontal: 32,
        }}
      >
        {message}
      </Text>
    </View>
  );
}
