import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "@/auth/AuthContext";
import { uploadProfileDocuments } from "@/api/api";
import type { CompleteProfileStackParamList } from "@/navigation/RootNavigator";

type Nav = NativeStackNavigationProp<CompleteProfileStackParamList, "CompleteProfile">;

const LOGO = require("../../../assets/logo.png");

const COLORS = {
  primary: "#14532D",
  primaryMid: "#166534",
  primaryDark: "#0F3D21",
  secondary: "#16A34A",
  accent: "#D4AF37",
  bgSoft: "#F3F6F4",
  cardBg: "#FFFFFF",
  labelDark: "#111827",
  muted: "#6B7280",
  gray: "#9CA3AF",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  dangerBorder: "#FECACA",
  idleBg: "#F9FAFB",
  idleBorder: "#E5E7EB",
  activeBg: "#ECFDF5",
  activeBorder: "#22C55E",
};

type Asset = ImagePicker.ImagePickerAsset;

type Slot = {
  key: "profile" | "cnic" | "license";
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  required: boolean;
};

export default function CompleteProfile() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<Nav>();
  const isDriver = user?.role === "Driver";

  const [profile, setProfile] = useState<Asset | null>(null);
  const [cnic, setCnic] = useState<Asset | null>(null);
  const [license, setLicense] = useState<Asset | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const slots: Slot[] = [
    { key: "profile", label: "Profile Photo",    icon: "user",        required: true },
    { key: "cnic",    label: "CNIC / National ID", icon: "credit-card", required: true },
    ...(isDriver
      ? [{ key: "license" as const, label: "Driving License", icon: "file-text" as const, required: true }]
      : []),
  ];

  async function pick(key: Slot["key"]) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Please allow photo library access to upload documents.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: key === "profile",
      aspect: key === "profile" ? [1, 1] : undefined,
    });
    if (res.canceled) return;
    const asset = res.assets[0];
    if (key === "profile") setProfile(asset);
    else if (key === "cnic") setCnic(asset);
    else setLicense(asset);
    setErrors((p) => ({ ...p, [key]: "" }));
    setServerError("");
  }

  function clear(key: Slot["key"]) {
    if (key === "profile") setProfile(null);
    else if (key === "cnic") setCnic(null);
    else setLicense(null);
  }

  async function onSubmit() {
    const errs: Record<string, string> = {};
    if (!profile) errs.profile = "Profile photo is required";
    if (!cnic) errs.cnic = "CNIC image is required";
    if (isDriver && !license) errs.license = "Driving license is required";
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    const form = new FormData();
    form.append("ProfileImage", assetToPart(profile!));
    form.append("CnicImage", assetToPart(cnic!));
    if (license) form.append("LicenseImage", assetToPart(license));

    setBusy(true);
    setServerError("");
    try {
      await uploadProfileDocuments(form);
      // Hand control to UnderReview — its CTA owns the markProfileComplete flip,
      // which lets the RootNavigator pick the next gate (AddVehicle or dashboard).
      navigation.replace("UnderReview");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (typeof err?.response?.data === "string" ? err.response.data : null) ??
        err?.message ??
        "Upload failed. Please try again.";
      setServerError(typeof msg === "string" ? msg : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: COLORS.bgSoft }}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primaryMid, COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 56, paddingBottom: 40, paddingHorizontal: 20 }}
        >
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 20,
                padding: 10,
                backgroundColor: "white",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 14,
                elevation: 10,
              }}
            >
              <Image source={LOGO} resizeMode="contain" style={{ width: 76, height: 76 }} />
            </View>
            <Text
              style={{
                color: "white",
                fontSize: 24,
                fontWeight: "800",
                letterSpacing: -0.3,
                marginTop: 16,
              }}
            >
              Complete Your Profile
            </Text>
            <Text
              style={{
                color: COLORS.accent,
                fontSize: 13,
                fontWeight: "500",
                marginTop: 4,
                textAlign: "center",
              }}
            >
              Finish setup to start using Saffar
            </Text>
          </View>
        </LinearGradient>

        {/* Form card */}
        <View
          style={{
            marginTop: -20,
            marginHorizontal: 16,
            borderRadius: 20,
            padding: 20,
            backgroundColor: COLORS.cardBg,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          {/* Who am I */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "rgba(20,83,45,0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: COLORS.primary, fontWeight: "800", fontSize: 16 }}>
                {(user?.fullName ?? "U")[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.labelDark }}>
                {user?.fullName}
              </Text>
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "rgba(22,163,74,0.1)",
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  marginTop: 2,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.secondary }}>
                  {user?.role}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 8,
              backgroundColor: "#ECFDF5",
              borderWidth: 1,
              borderColor: "#A7F3D0",
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Feather name="info" size={14} color={COLORS.secondary} />
            <Text style={{ flex: 1, fontSize: 12, color: COLORS.secondary }}>
              Documents can only be submitted once. Admin will review within 24h.
            </Text>
          </View>

          {serverError ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.dangerBorder,
                backgroundColor: COLORS.dangerBg,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 14,
              }}
            >
              <Feather name="alert-circle" size={14} color="#DC2626" />
              <Text style={{ flex: 1, color: "#B91C1C", fontSize: 13 }}>{serverError}</Text>
            </View>
          ) : null}

          {slots.map((slot) => {
            const asset =
              slot.key === "profile" ? profile : slot.key === "cnic" ? cnic : license;
            return (
              <UploadSlot
                key={slot.key}
                label={slot.label}
                icon={slot.icon}
                required={slot.required}
                asset={asset}
                error={errors[slot.key]}
                disabled={busy}
                onPick={() => pick(slot.key)}
                onClear={() => clear(slot.key)}
              />
            );
          })}

          {/* Submit */}
          <Pressable
            onPress={onSubmit}
            disabled={busy}
            style={({ pressed }) => ({
              marginTop: 10,
              borderRadius: 14,
              overflow: "hidden",
              opacity: busy ? 0.7 : 1,
              transform: [{ scale: pressed && !busy ? 0.97 : 1 }],
              shadowColor: COLORS.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 6,
            })}
          >
            <LinearGradient
              colors={[COLORS.primaryMid, COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                height: 52,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              {busy ? (
                <>
                  <ActivityIndicator color="white" />
                  <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
                    Uploading…
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={{
                      color: "white",
                      fontSize: 16,
                      fontWeight: "700",
                      letterSpacing: 0.3,
                    }}
                  >
                    Complete Profile
                  </Text>
                  <Feather name="arrow-right" size={18} color="white" />
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => logout()} hitSlop={8} style={{ marginTop: 14, alignSelf: "center" }}>
            <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: "600" }}>
              Sign out
            </Text>
          </Pressable>
        </View>

        <View style={{ alignItems: "center", marginTop: 24 }}>
          <View style={{ height: 3, width: 48, borderRadius: 999, backgroundColor: COLORS.accent }} />
          <Text style={{ marginTop: 8, color: COLORS.muted, fontSize: 11 }}>
            Secure • Verified • Trusted
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function UploadSlot({
  label,
  icon,
  required,
  asset,
  error,
  disabled,
  onPick,
  onClear,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  required: boolean;
  asset: Asset | null;
  error?: string;
  disabled: boolean;
  onPick: () => void;
  onClear: () => void;
}) {
  const filled = !!asset;
  const hasError = !!error;
  const borderColor = hasError
    ? "#F87171"
    : filled
    ? COLORS.activeBorder
    : COLORS.idleBorder;
  const bg = hasError ? COLORS.dangerBg : filled ? COLORS.activeBg : COLORS.idleBg;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: COLORS.labelDark,
          marginBottom: 6,
        }}
      >
        {label}
        {required ? <Text style={{ color: COLORS.danger }}> *</Text> : null}
      </Text>

      <Pressable
        onPress={disabled ? undefined : onPick}
        style={{
          borderRadius: 14,
          borderWidth: 1.5,
          borderStyle: "dashed",
          borderColor,
          backgroundColor: bg,
          paddingVertical: 18,
          paddingHorizontal: 16,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {filled && asset?.uri ? (
          <Image
            source={{ uri: asset.uri }}
            style={{
              width: 96,
              height: 96,
              borderRadius: 12,
              marginBottom: 10,
              backgroundColor: "#E5E7EB",
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "rgba(22,163,74,0.12)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
            }}
          >
            <Feather name={icon} size={22} color={COLORS.secondary} />
          </View>
        )}

        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: filled ? COLORS.secondary : COLORS.labelDark,
            textAlign: "center",
          }}
          numberOfLines={1}
        >
          {filled ? asset?.fileName ?? "Image selected" : "Tap to upload"}
        </Text>
        {!filled ? (
          <Text style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>
            JPG, PNG · Max 3 MB
          </Text>
        ) : null}

        {filled && !disabled ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onClear();
            }}
            hitSlop={6}
            style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Feather name="x-circle" size={12} color={COLORS.danger} />
            <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: "600" }}>
              Remove
            </Text>
          </Pressable>
        ) : null}
      </Pressable>

      {hasError ? (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 }}>
          <Feather name="alert-circle" size={11} color={COLORS.danger} />
          <Text style={{ fontSize: 11, color: COLORS.danger }}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

function assetToPart(asset: Asset): any {
  const uri = asset.uri;
  const name =
    asset.fileName ??
    uri.split("/").pop() ??
    `upload-${Date.now()}.jpg`;
  const ext = (name.split(".").pop() ?? "jpg").toLowerCase();
  const mime =
    asset.mimeType ??
    (ext === "png" ? "image/png" : ext === "pdf" ? "application/pdf" : "image/jpeg");
  return { uri, name, type: mime };
}
