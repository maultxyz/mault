import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="collection/[guid]" />
      <Stack.Screen name="card/[scanId]" options={{ presentation: "modal" }} />
      <Stack.Screen name="rules/[binNumber]" />
      <Stack.Screen name="rules/mode" />
      <Stack.Screen name="rules/repack" />
      <Stack.Screen name="stats" />
      <Stack.Screen name="collection-new" options={{ presentation: "modal" }} />
      <Stack.Screen name="collection-rename" options={{ presentation: "modal" }} />
      <Stack.Screen name="storage-name" options={{ presentation: "modal" }} />
      <Stack.Screen name="desktop-camera/[guid]" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
