import "@/lib/i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OrgThemeProvider } from "@/components/org-theme-provider";
import { PendingSavesProvider } from "@/features/scanner/api/use-pending-saves";
import { SorterProvider } from "@/features/sorter/api/use-sorter";
import { AppStreamProvider } from "@/features/stream/api/use-app-stream";
import { useTheme } from "@/hooks/use-theme";
import { applyThemePreference, readThemePreference } from "@/lib/appearance";
import { restoreSession, useSession } from "@/lib/auth/session";
import { FONT_ASSETS } from "@/lib/constants/fonts";
import { queryClient } from "@/lib/query-client";

void SplashScreen.preventAutoHideAsync();
applyThemePreference(readThemePreference());

function RootNavigator() {
  const { status } = useSession();
  const colors = useTheme();
  const scheme = useColorScheme();
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const ready = status !== "loading" && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.primaryText,
          background: colors.background,
          card: colors.card,
          text: colors.foreground,
          border: colors.border,
        },
      }}
    >
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === "signed-in"}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={status !== "signed-in"}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void restoreSession();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <OrgThemeProvider>
            <SorterProvider>
              <AppStreamProvider>
                <PendingSavesProvider>
                  <RootNavigator />
                </PendingSavesProvider>
              </AppStreamProvider>
            </SorterProvider>
          </OrgThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
