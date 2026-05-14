import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "@/screens/auth/Login";
import Signup from "@/screens/auth/Signup";
import ForgotPassword from "@/screens/auth/ForgotPassword";
import ResetPassword from "@/screens/auth/ResetPassword";
import OtpVerification from "@/screens/auth/OtpVerification";
import type { OtpPurpose } from "@/api/api";

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string; devOtp?: string };
  OtpVerification: { email: string; purpose?: OtpPurpose; devOtp?: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />
      <Stack.Screen
        name="OtpVerification"
        component={OtpVerification}
        options={{ animation: "slide_from_right" }}
      />
    </Stack.Navigator>
  );
}
