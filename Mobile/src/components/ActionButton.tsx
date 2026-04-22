import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "@/theme/colors";

type MDIconName = React.ComponentProps<typeof MaterialIcons>["name"];

type Props = {
  label: string;
  icon: MDIconName;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  dim?: boolean;
};

export default function ActionButton({
  label,
  icon,
  onPress,
  active = false,
  disabled,
  dim,
}: Props) {
  const gradient = active
    ? (["#22C55E", "#16A34A"] as const)
    : (["rgba(255,255,255,0.12)", "rgba(255,255,255,0.04)"] as const);

  const borderColor = active ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.22)";
  const badgeBg = active ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.14)";
  const badgeBorder = active
    ? "rgba(255,255,255,0.50)"
    : "rgba(255,255,255,0.20)";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        width: 88,
        opacity: disabled ? 0.4 : dim ? 0.5 : pressed ? 0.9 : 1,
        shadowColor: active ? COLORS.accent : "#000",
        shadowOffset: { width: 0, height: active ? 10 : 6 },
        shadowOpacity: active ? 0.45 : 0.35,
        shadowRadius: active ? 14 : 10,
        elevation: active ? 10 : 6,
      })}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor,
          paddingVertical: 14,
          paddingHorizontal: 8,
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            backgroundColor: badgeBg,
            borderWidth: 1,
            borderColor: badgeBorder,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name={icon} size={22} color="white" />
        </View>
        <Text
          style={{
            color: "white",
            fontSize: 11.5,
            fontWeight: "700",
            letterSpacing: 0.1,
            textAlign: "center",
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export { COLORS };
