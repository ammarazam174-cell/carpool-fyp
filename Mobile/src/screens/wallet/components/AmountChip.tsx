import { Pressable, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { COLORS } from "@/theme/colors";

type Props = {
  amount: number;
  selected: boolean;
  disabled?: boolean;
  onPress: (amount: number) => void;
};

export default function AmountChip({
  amount,
  selected,
  disabled,
  onPress,
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.94, { damping: 14, stiffness: 220 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 220 });
        }}
        onPress={() => onPress(amount)}
        disabled={disabled}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 9,
          borderRadius: 999,
          backgroundColor: selected ? COLORS.accent : COLORS.cardAlt,
          borderWidth: 1.5,
          borderColor: selected ? COLORS.accent : COLORS.border,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text
          style={{
            color: selected ? "#052e16" : COLORS.textLight,
            fontWeight: "700",
            fontSize: 13,
            letterSpacing: 0.2,
          }}
        >
          Rs. {amount.toLocaleString()}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
