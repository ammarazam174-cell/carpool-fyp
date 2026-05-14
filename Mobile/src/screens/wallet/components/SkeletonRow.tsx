import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { COLORS } from "@/theme/colors";

// Shimmering placeholder for transaction rows during initial load.
export default function SkeletonRow() {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const Block = ({
    width,
    height = 12,
    radius = 6,
    style,
  }: {
    width: number | string;
    height?: number;
    radius?: number;
    style?: object;
  }) => (
    <Animated.View
      style={[
        {
          backgroundColor: COLORS.cardAlt,
          width: width as any,
          height,
          borderRadius: radius,
        },
        animated,
        style ?? {},
      ]}
    />
  );

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 13,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <Block width={40} height={40} radius={20} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Block width="60%" height={13} />
        <Block width="40%" height={10} style={{ marginTop: 8 }} />
      </View>
      <Block width={80} height={14} style={{ marginLeft: 8 }} />
    </View>
  );
}
