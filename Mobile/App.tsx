import "./global.css";
import { LogBox } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthContext";
import RootNavigator from "@/navigation/RootNavigator";
import WhatsAppFab from "@/components/WhatsAppFab";
import { FabVisibilityProvider } from "@/components/FabVisibility";

// react-native-svg's Fabric codegen runs against its TS sources via
// @react-native/babel-preset. Our Metro resolver redirects the package to its
// pre-compiled CommonJS entry (to work around a Metro resolution bug in
// 15.11.2), which skips that pass and produces RNSVG* codegen warnings in dev.
// Expo Go already ships svg with codegen baked in, so these are harmless.
LogBox.ignoreLogs([/Codegen didn't run for RNSVG/]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FabVisibilityProvider>
            <RootNavigator />
            {/* Global WhatsApp support FAB — floats over every stack. Rendered
                after RootNavigator so it sits on top of screen content.
                Screens can hide it via useHideFab() (e.g. payment flows where
                the pulsing halo overlaps the primary CTA). */}
            <WhatsAppFab />
            <StatusBar style="auto" />
          </FabVisibilityProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
