import { View, type ViewProps, type ViewStyle } from "react-native";
import { COLORS } from "@/theme/colors";

type Props = ViewProps & {
  padded?: boolean;
  tight?: boolean;
  accent?: string;
  style?: ViewStyle;
};

export default function Card({
  padded = true,
  tight = false,
  accent,
  style,
  children,
  ...rest
}: Props) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: COLORS.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.06)",
          padding: padded ? (tight ? 14 : 18) : 0,
          borderLeftWidth: accent ? 4 : 1,
          borderLeftColor: accent ?? "rgba(255,255,255,0.06)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 4,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
