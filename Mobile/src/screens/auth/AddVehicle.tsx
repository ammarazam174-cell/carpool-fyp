import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { createVehicle } from "@/api/api";
import { useAuth } from "@/auth/AuthContext";

type RegistrationDocAsset = {
  uri: string;
  name: string;
  mimeType: string;
};

type AddVehicleRouteParams = { mode?: "onboarding" | "normal" };

const LOGO = require("../../../assets/logo.png");

const COLORS = {
  primary: "#14532D",
  primaryMid: "#166534",
  primaryDark: "#0F3D21",
  secondary: "#16A34A",
  accent: "#D4AF37",
  bgSoft: "#F3F6F4",
  inputBg: "#F9FAFB",
  inputIdle: "#E5E7EB",
  labelDark: "#111827",
  muted: "#6B7280",
  gray: "#9CA3AF",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  dangerBorder: "#FECACA",
  successBg: "#ECFDF5",
  successBorder: "#A7F3D0",
  successText: "#15803D",
};

type FieldKey = "name" | "year" | "plate" | "seats" | "color";

type FormState = Record<FieldKey, string>;

const CURRENT_YEAR = new Date().getFullYear();

const validate: Record<FieldKey, (v: string) => string> = {
  name: (v) =>
    v.trim().length >= 3
      ? /\s/.test(v.trim())
        ? ""
        : "Please include make & model (e.g. Honda Civic)"
      : "Vehicle name is required",
  year: (v) => {
    if (!v) return "Model year is required";
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) return "Year must be a number";
    if (n < 1980 || n > CURRENT_YEAR + 1)
      return `Year must be between 1980 and ${CURRENT_YEAR + 1}`;
    return "";
  },
  plate: (v) =>
    v.trim().length >= 4 ? "" : "Registration number is required",
  seats: (v) => {
    if (!v) return "Seats are required";
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) return "Seats must be a number";
    if (n < 1 || n > 8) return "Seats must be between 1 and 8";
    return "";
  },
  color: (v) => (v.trim().length >= 2 ? "" : "Color is required"),
};

export default function AddVehicle() {
  const { markVehicleAdded, logout } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, AddVehicleRouteParams>, string>>();
  const isOnboarding = route?.params?.mode === "onboarding";

  const [fields, setFields] = useState<FormState>({
    name: "",
    year: "",
    plate: "",
    seats: "4",
    color: "",
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [focused, setFocused] = useState<FieldKey | null>(null);
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [registrationDoc, setRegistrationDoc] = useState<RegistrationDocAsset | null>(null);
  const [registrationDocError, setRegistrationDocError] = useState<string>("");

  async function pickRegistrationDoc() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission needed",
          "Allow photo library access so you can attach your registration document."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      const guessedName =
        asset.fileName ?? `registration-${Date.now()}.jpg`;
      const guessedType =
        asset.mimeType ??
        (guessedName.toLowerCase().endsWith(".png")
          ? "image/png"
          : "image/jpeg");
      setRegistrationDoc({
        uri: asset.uri,
        name: guessedName,
        mimeType: guessedType,
      });
      setRegistrationDocError("");
      setServerError("");
    } catch (err: any) {
      console.warn("[AddVehicle] pickRegistrationDoc failed:", err);
      Alert.alert("Could not open picker", err?.message ?? "Please try again.");
    }
  }

  const isValid = useMemo(
    () =>
      (Object.keys(fields) as FieldKey[]).every((k) => !validate[k](fields[k])) &&
      registrationDoc != null,
    [fields, registrationDoc]
  );

  function change(key: FieldKey, value: string) {
    setFields((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: validate[key](value) }));
    setServerError("");
  }

  async function onSubmit() {
    const errs: Partial<FormState> = {};
    (Object.keys(fields) as FieldKey[]).forEach((k) => {
      const err = validate[k](fields[k]);
      if (err) errs[k] = err;
    });
    setErrors(errs);
    const docErr = registrationDoc ? "" : "Registration document is required";
    setRegistrationDocError(docErr);
    if (Object.values(errs).some(Boolean) || docErr) return;

    // Backend stores Make + Model + Plate + Seats.
    // Split "Vehicle Name" on first space so Make + Model map cleanly.
    // Year and Color aren't first-class columns yet — fold them into Model as a
    // human-readable suffix so the data is preserved until a migration adds real columns.
    const trimmed = fields.name.trim().replace(/\s+/g, " ");
    const firstSpace = trimmed.indexOf(" ");
    const make = trimmed.slice(0, firstSpace);
    const modelCore = trimmed.slice(firstSpace + 1);
    const model = `${fields.year.trim()} ${modelCore} · ${fields.color.trim()}`;

    setBusy(true);
    setServerError("");
    try {
      await createVehicle({
        make,
        model,
        plateNumber: fields.plate.trim().toUpperCase(),
        seats: parseInt(fields.seats, 10),
        registrationDoc: registrationDoc ?? undefined,
      });
      console.log("[AddVehicle] createVehicle OK");
      setJustSubmitted(true);

      if (isOnboarding) {
        // Onboarding: mark the session so RootNavigator re-keys. The newly
        // created vehicle is always Pending admin review (IsVerified=false),
        // so pickStack() resolves to the VehiclePending stack, not the driver
        // dashboard. Awaiting this guarantees the session is persisted before
        // the navigator re-renders — the previous setTimeout race left
        // `hasVehicle: false` in the log because the timer fired after the
        // component unmounted.
        console.log("[AddVehicle] onboarding → markVehicleAdded");
        await markVehicleAdded();
        return;
      }

      // Normal flow (pushed from MyVehicles / CreateRide): pop back so the
      // caller can refetch on focus.
      console.log("[AddVehicle] normal → goBack");
      if (navigation.canGoBack()) navigation.goBack();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (typeof err?.response?.data === "string" ? err.response.data : null) ??
        err?.message ??
        "Could not add vehicle. Please try again.";
      setServerError(
        typeof msg === "string" ? msg : "Could not add vehicle. Please try again."
      );
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
        <LinearGradient
          colors={[COLORS.primaryMid, COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 56, paddingBottom: 40, paddingHorizontal: 20 }}
        >
          {!isOnboarding ? (
            <Pressable
              onPress={() => navigation.canGoBack() && navigation.goBack()}
              hitSlop={10}
              style={({ pressed }) => ({
                position: "absolute",
                top: 52,
                left: 16,
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "rgba(255,255,255,0.12)",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
                zIndex: 2,
              })}
            >
              <Feather name="arrow-left" size={20} color="white" />
            </Pressable>
          ) : null}
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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginTop: 16,
              }}
            >
              <Feather name="truck" size={22} color="white" />
              <Text
                style={{
                  color: "white",
                  fontSize: 24,
                  fontWeight: "800",
                  letterSpacing: -0.3,
                }}
              >
                {isOnboarding ? "Add Your Vehicle" : "Add New Vehicle"}
              </Text>
            </View>
            <Text
              style={{
                color: COLORS.accent,
                fontSize: 13,
                fontWeight: "500",
                marginTop: 4,
                textAlign: "center",
              }}
            >
              {isOnboarding
                ? "Required to start offering rides"
                : "Add another vehicle"}
            </Text>
          </View>
        </LinearGradient>

        <View
          style={{
            marginTop: -20,
            marginHorizontal: 16,
            borderRadius: 20,
            padding: 20,
            backgroundColor: "white",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.primary }}>
            Vehicle Details
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: COLORS.muted,
              marginTop: 4,
              marginBottom: 18,
            }}
          >
            Enter your car's details so passengers can book the right ride.
          </Text>

          {justSubmitted ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.successBorder,
                backgroundColor: COLORS.successBg,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 14,
              }}
            >
              <Feather name="check-circle" size={16} color={COLORS.successText} />
              <Text style={{ color: COLORS.successText, fontSize: 13, fontWeight: "600" }}>
                Vehicle added · Taking you to your dashboard…
              </Text>
            </View>
          ) : null}

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
              <Text style={{ flex: 1, color: "#B91C1C", fontSize: 13 }}>
                {serverError}
              </Text>
            </View>
          ) : null}

          <Field label="Vehicle Name" required error={errors.name} hint="e.g. Honda Civic">
            <IconInput
              icon="truck"
              placeholder="Honda Civic"
              value={fields.name}
              onChangeText={(v) => change("name", v)}
              autoCapitalize="words"
              focused={focused === "name"}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
              hasError={!!errors.name}
            />
          </Field>

          <Field label="Model Year" required error={errors.year}>
            <IconInput
              icon="calendar"
              placeholder="2020"
              value={fields.year}
              onChangeText={(v) => change("year", v.replace(/\D/g, "").slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              focused={focused === "year"}
              onFocus={() => setFocused("year")}
              onBlur={() => setFocused(null)}
              hasError={!!errors.year}
            />
          </Field>

          <Field
            label="Registration Number"
            required
            error={errors.plate}
            hint="As printed on the plate"
          >
            <IconInput
              icon="hash"
              placeholder="ABC-123"
              value={fields.plate}
              onChangeText={(v) => change("plate", v.toUpperCase().slice(0, 12))}
              autoCapitalize="characters"
              autoCorrect={false}
              focused={focused === "plate"}
              onFocus={() => setFocused("plate")}
              onBlur={() => setFocused(null)}
              hasError={!!errors.plate}
              mono
            />
          </Field>

          <Field label="Seats" required error={errors.seats}>
            <IconInput
              icon="users"
              placeholder="4"
              value={fields.seats}
              onChangeText={(v) => change("seats", v.replace(/\D/g, "").slice(0, 1))}
              keyboardType="number-pad"
              maxLength={1}
              focused={focused === "seats"}
              onFocus={() => setFocused("seats")}
              onBlur={() => setFocused(null)}
              hasError={!!errors.seats}
            />
          </Field>

          <Field label="Color" required error={errors.color}>
            <IconInput
              icon="droplet"
              placeholder="White"
              value={fields.color}
              onChangeText={(v) => change("color", v)}
              autoCapitalize="words"
              focused={focused === "color"}
              onFocus={() => setFocused("color")}
              onBlur={() => setFocused(null)}
              hasError={!!errors.color}
            />
          </Field>

          {/* Registration document — required for admin verification. */}
          <View style={{ marginBottom: 14 }}>
            <Text
              style={{
                color: COLORS.labelDark,
                fontSize: 13,
                fontWeight: "600",
                marginBottom: 6,
              }}
            >
              Registration Document
              <Text style={{ color: COLORS.danger }}> *</Text>
            </Text>

            {registrationDoc ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: COLORS.successBg,
                  borderWidth: 1,
                  borderColor: COLORS.successBorder,
                }}
              >
                <Image
                  source={{ uri: registrationDoc.uri }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 8,
                    backgroundColor: "#000",
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: COLORS.successText,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                    numberOfLines={1}
                  >
                    {registrationDoc.name}
                  </Text>
                  <Text
                    style={{
                      color: COLORS.muted,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    Attached — admin will review before approval
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <Pressable
                    onPress={pickRegistrationDoc}
                    hitSlop={6}
                    style={({ pressed }) => ({
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: "white",
                      borderWidth: 1,
                      borderColor: COLORS.inputIdle,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: COLORS.labelDark,
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      Replace
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setRegistrationDoc(null)}
                    hitSlop={6}
                    style={({ pressed }) => ({
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: COLORS.dangerBg,
                      borderWidth: 1,
                      borderColor: COLORS.dangerBorder,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: COLORS.danger,
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={pickRegistrationDoc}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: registrationDocError
                    ? COLORS.dangerBg
                    : COLORS.inputBg,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: registrationDocError
                    ? COLORS.dangerBorder
                    : COLORS.inputIdle,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "white",
                    borderWidth: 1,
                    borderColor: COLORS.inputIdle,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="upload" size={16} color={COLORS.primaryMid} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: COLORS.labelDark,
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    Upload registration
                  </Text>
                  <Text
                    style={{
                      color: COLORS.muted,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    JPG or PNG · up to 5 MB
                  </Text>
                </View>
              </Pressable>
            )}

            {registrationDocError ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 6,
                  gap: 4,
                }}
              >
                <Feather name="alert-circle" size={11} color={COLORS.danger} />
                <Text style={{ fontSize: 11, color: COLORS.danger }}>
                  {registrationDocError}
                </Text>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={onSubmit}
            disabled={!isValid || busy || justSubmitted}
            style={({ pressed }) => ({
              marginTop: 10,
              borderRadius: 14,
              overflow: "hidden",
              opacity: !isValid || busy ? 0.55 : 1,
              transform: [
                { scale: pressed && isValid && !busy ? 0.97 : 1 },
              ],
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
                    Adding vehicle…
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
                    Add Vehicle & Continue
                  </Text>
                  <Feather name="arrow-right" size={18} color="white" />
                </>
              )}
            </LinearGradient>
          </Pressable>

          {isOnboarding ? (
            <Pressable
              onPress={() => logout()}
              hitSlop={8}
              style={{ marginTop: 14, alignSelf: "center" }}
            >
              <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: "600" }}>
                Sign out
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── UI primitives ───────────────────────────────────────────────────────────

type FeatherName = React.ComponentProps<typeof Feather>["name"];

function IconInput(props: {
  icon: FeatherName;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  hasError?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  maxLength?: number;
  mono?: boolean;
}) {
  const {
    icon,
    placeholder,
    value,
    onChangeText,
    focused,
    onFocus,
    onBlur,
    hasError,
    keyboardType,
    autoCapitalize,
    autoCorrect,
    maxLength,
    mono,
  } = props;

  const borderColor = hasError
    ? "#F87171"
    : focused
    ? COLORS.secondary
    : "transparent";
  const iconColor = hasError
    ? "#DC2626"
    : focused
    ? COLORS.secondary
    : COLORS.muted;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: hasError ? COLORS.dangerBg : COLORS.inputBg,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor,
        paddingHorizontal: 12,
        height: 50,
      }}
    >
      <Feather name={icon} size={18} color={iconColor} style={{ marginRight: 10 }} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={COLORS.gray}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        maxLength={maxLength}
        style={{
          flex: 1,
          fontSize: 14,
          color: COLORS.labelDark,
          fontFamily: mono
            ? Platform.OS === "ios"
              ? "Menlo"
              : "monospace"
            : undefined,
          letterSpacing: mono ? 0.5 : 0,
          paddingVertical: 0,
        }}
      />
    </View>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
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
      {children}
      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 }}>
          <Feather name="alert-circle" size={11} color={COLORS.danger} />
          <Text style={{ fontSize: 11, color: COLORS.danger }}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
