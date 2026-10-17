import { router, useIsFocused } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { parsePairingLink } from "@/features/scanner/api/phone-camera";
import { useQrScanner } from "@/features/scanner/api/use-qr-scanner";
import { useAppState } from "@/hooks/use-app-state";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";

export default function PairCameraScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const focused = useIsFocused();
  const appState = useAppState();
  const permission = useCameraPermission();
  const device = useCameraDevice("back");
  const [invalid, setInvalid] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [link, setLink] = useState("");
  const handledRef = useRef(false);
  const active = focused && appState === "active" && permission.hasPermission && !!device;

  const openLink = useCallback((text: string) => {
    if (handledRef.current) return;
    const guid = parsePairingLink(text);
    if (!guid) {
      setInvalid(true);
      return;
    }
    handledRef.current = true;
    router.replace({ pathname: "/desktop-camera/[guid]", params: { guid } });
  }, []);

  const scanner = useQrScanner(openLink, active);

  return (
    <Screen header={<PageHeader title={t("pairing.title")} subtitle={t("pairing.subtitle")} onBack={() => router.back()} />}>
      <Callout tone="info" title={t("pairing.hint")} />
      {!permission.hasPermission ? (
        <EmptyState
          icon="camera"
          title={t("scan.cameraPermissionTitle")}
          description={t("scan.cameraPermissionDescription")}
          action={<Button label={t("scan.allowCamera")} onPress={() => void permission.requestPermission()} />}
        />
      ) : device ? (
        <View
          style={{
            width: "100%",
            aspectRatio: 1,
            borderRadius: RADIUS.xl,
            overflow: "hidden",
            backgroundColor: colors.camera,
          }}
        >
          <Camera style={StyleSheet.absoluteFill} device={device} isActive={active} outputs={scanner.outputs} resizeMode="cover" />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: "20%",
              left: "20%",
              right: "20%",
              bottom: "20%",
              borderWidth: 3,
              borderRadius: RADIUS.lg,
              borderColor: colors.onCamera,
            }}
          />
        </View>
      ) : (
        <EmptyState icon="camera" title={t("scan.noCamera")} />
      )}
      {invalid ? (
        <Callout tone="warning" title={t("pairing.invalidTitle")} description={t("pairing.invalidDescription")} />
      ) : null}
      {pasting ? (
        <View style={{ gap: SPACING.sm }}>
          <TextField
            label={t("pairing.linkLabel")}
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            keyboardType="default"
            returnKeyType="go"
            onSubmitEditing={() => openLink(link)}
          />
          <Button label={t("pairing.connect")} disabled={!link.trim()} onPress={() => openLink(link)} />
        </View>
      ) : (
        <Button variant="ghost" label={t("pairing.paste")} onPress={() => setPasting(true)} />
      )}
    </Screen>
  );
}
