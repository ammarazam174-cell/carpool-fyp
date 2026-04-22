import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { register } from "@/api/api";
import type { Role } from "@/types/auth";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/navigation/AuthStack";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;
type SignupRole = Exclude<Role, "Admin">;
type Gender = "Male" | "Female" | "Other" | "";
type FieldName =
  | "fullName"
  | "email"
  | "phoneNumber"
  | "cnic"
  | "dateOfBirth"
  | "password";

const LOGO = require("../../../assets/logo.png");
const DOB_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const COLORS = {
  primary: "#14532D",
  primaryMid: "#166534",
  primaryDark: "#0F3D21",
  secondary: "#16A34A",
  accent: "#D4AF37",
  bgSoft: "#F3F6F4",
  inputBg: "#F9FAFB",
  inputIdle: "#E5E7EB",
  pillIdle: "#E5E7EB",
  pillIdleText: "#374151",
  labelDark: "#111827",
  muted: "#6B7280",
  gray: "#9CA3AF",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  dangerBorder: "#FECACA",
  successText: "#15803D",
};

function calcAge(dob: string): number | null {
  if (!DOB_REGEX.test(dob)) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

const validate = {
  fullName: (v: string) => (v.trim() ? "" : "Full name is required"),
  email: (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Enter a valid email address",
  phoneNumber: (v: string) =>
    /^03\d{9}$/.test(v) ? "" : "Format: 03XXXXXXXXX (11 digits)",
  cnic: (v: string) =>
    v.replace(/\D/g, "").length === 13 ? "" : "CNIC must be exactly 13 digits",
  password: (v: string) =>
    v.length >= 6 ? "" : "Password must be at least 6 characters",
  dateOfBirth: (v: string) => {
    if (!v) return "Date of birth is required";
    if (!DOB_REGEX.test(v)) return "Use format YYYY-MM-DD";
    const age = calcAge(v);
    if (age === null) return "Invalid date";
    if (age < 18) return "You must be at least 18 years old";
    if (age > 80) return "Please enter a valid date of birth";
    return "";
  },
  gender: (v: string) => (v ? "" : "Gender is required"),
};

function formatCnic(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

function formatDob(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

export default function Signup({ navigation }: Props) {
  const [fields, setFields] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    cnic: "",
    password: "",
    role: "Passenger" as SignupRole,
    dateOfBirth: "",
    gender: "" as Gender,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focused, setFocused] = useState<FieldName | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const agePreview = useMemo(() => {
    if (!fields.dateOfBirth || validate.dateOfBirth(fields.dateOfBirth)) return null;
    return calcAge(fields.dateOfBirth);
  }, [fields.dateOfBirth]);

  function change<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields((p) => ({ ...p, [key]: value }));
    const fn = (validate as Record<string, (v: string) => string>)[key as string];
    if (fn) setErrors((p) => ({ ...p, [key]: fn(value as string) }));
    setServerError("");
  }

  async function onSubmit() {
    const errs: Record<string, string> = {
      fullName: validate.fullName(fields.fullName),
      email: validate.email(fields.email),
      phoneNumber: validate.phoneNumber(fields.phoneNumber),
      cnic: validate.cnic(fields.cnic),
      password: validate.password(fields.password),
      dateOfBirth: validate.dateOfBirth(fields.dateOfBirth),
      gender: validate.gender(fields.gender),
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setBusy(true);
    setServerError("");
    try {
      await register({
        fullName: fields.fullName.trim(),
        email: fields.email.trim(),
        phoneNumber: fields.phoneNumber.trim(),
        cnic: fields.cnic.replace(/\D/g, ""),
        password: fields.password,
        role: fields.role,
        dateOfBirth: fields.dateOfBirth,
        gender: fields.gender,
      });
      navigation.replace("Login");
    } catch (err: any) {
      const msg =
        err?.response?.data ?? err?.message ?? "Registration failed. Please try again.";
      setServerError(
        typeof msg === "string" ? msg : "Registration failed. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
      style={{ backgroundColor: COLORS.bgSoft }}
    >
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: COLORS.bgSoft }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={[COLORS.primaryMid, COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 56, paddingBottom: 40, paddingHorizontal: 20 }}
        >
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 104,
                height: 104,
                borderRadius: 20,
                padding: 12,
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
              <Image
                source={LOGO}
                resizeMode="contain"
                style={{ width: 80, height: 80 }}
              />
            </View>

            <Text
              style={{
                color: "white",
                fontSize: 30,
                fontWeight: "800",
                letterSpacing: -0.5,
                marginTop: 16,
              }}
            >
              Saffar
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
              Pakistan's trusted carpooling platform
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                marginTop: 20,
                gap: 8,
              }}
            >
              {[
                { icon: "lock" as const, label: "Data is secure" },
                { icon: "check-circle" as const, label: "Verified drivers" },
                { icon: "shield" as const, label: "Safe rides" },
              ].map((b) => (
                <View
                  key={b.label}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "rgba(255,255,255,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.18)",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                  }}
                >
                  <Feather name={b.icon} size={12} color="white" />
                  <Text style={{ color: "white", fontSize: 11, fontWeight: "500" }}>
                    {b.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* ── Form card ── */}
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
            Create Account
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: COLORS.muted,
              marginTop: 4,
              marginBottom: 18,
            }}
          >
            Join thousands of commuters across Pakistan
          </Text>

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

          {/* Full name */}
          <Field label="Full Name" required error={errors.fullName}>
            <Input
              icon="user"
              placeholder="e.g. Ali Khan"
              value={fields.fullName}
              onChangeText={(v) => change("fullName", v)}
              autoCapitalize="words"
              focused={focused === "fullName"}
              onFocus={() => setFocused("fullName")}
              onBlur={() => setFocused(null)}
              hasError={!!errors.fullName}
            />
          </Field>

          {/* Email */}
          <Field label="Email Address" required error={errors.email}>
            <Input
              icon="mail"
              placeholder="ali@example.com"
              value={fields.email}
              onChangeText={(v) => change("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              focused={focused === "email"}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              hasError={!!errors.email}
            />
          </Field>

          {/* Phone */}
          <Field
            label="Phone Number"
            required
            error={errors.phoneNumber}
            hint="OTP will be sent to this number for verification"
            hintIcon="smartphone"
            hintTone="info"
          >
            <Input
              icon="phone"
              placeholder="03XXXXXXXXX"
              value={fields.phoneNumber}
              onChangeText={(v) =>
                change("phoneNumber", v.replace(/\D/g, "").slice(0, 11))
              }
              keyboardType="phone-pad"
              maxLength={11}
              focused={focused === "phoneNumber"}
              onFocus={() => setFocused("phoneNumber")}
              onBlur={() => setFocused(null)}
              hasError={!!errors.phoneNumber}
            />
          </Field>

          {/* CNIC */}
          <Field
            label="CNIC Number"
            required
            error={errors.cnic}
            hint="Format: XXXXX-XXXXXXX-X (13 digits, auto-formatted)"
          >
            <Input
              icon="credit-card"
              placeholder="42501-7669968-9"
              value={fields.cnic}
              onChangeText={(v) => change("cnic", formatCnic(v))}
              keyboardType="number-pad"
              maxLength={15}
              focused={focused === "cnic"}
              onFocus={() => setFocused("cnic")}
              onBlur={() => setFocused(null)}
              hasError={!!errors.cnic}
              mono
            />
          </Field>

          {/* DOB */}
          <Field
            label="Date of Birth"
            required
            error={errors.dateOfBirth}
            hint={
              agePreview !== null
                ? `Age: ${agePreview} years`
                : !fields.dateOfBirth
                ? "Must be at least 18 years old"
                : undefined
            }
            hintIcon={agePreview !== null ? "check" : undefined}
            hintTone={agePreview !== null ? "success" : "muted"}
          >
            <Input
              icon="calendar"
              placeholder="YYYY-MM-DD"
              value={fields.dateOfBirth}
              onChangeText={(v) => change("dateOfBirth", formatDob(v))}
              keyboardType="number-pad"
              maxLength={10}
              focused={focused === "dateOfBirth"}
              onFocus={() => setFocused("dateOfBirth")}
              onBlur={() => setFocused(null)}
              hasError={!!errors.dateOfBirth}
            />
          </Field>

          {/* Gender — 3 cards, always visible */}
          <Field label="Gender" required error={errors.gender}>
            <View style={styles.genderRow}>
              <GenderCard
                label="Male"
                iconName="user"
                active={fields.gender === "Male"}
                onPress={() => change("gender", "Male")}
              />
              <GenderCard
                label="Female"
                iconName="user"
                active={fields.gender === "Female"}
                onPress={() => change("gender", "Female")}
              />
              <GenderCard
                label="Other"
                iconName="users"
                active={fields.gender === "Other"}
                onPress={() => change("gender", "Other")}
              />
            </View>
          </Field>

          {/* Password */}
          <Field label="Password" required error={errors.password}>
            <Input
              icon="lock"
              placeholder="Min. 6 characters"
              value={fields.password}
              onChangeText={(v) => change("password", v)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              focused={focused === "password"}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              hasError={!!errors.password}
              trailing={
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={COLORS.secondary}
                  />
                </Pressable>
              }
            />
          </Field>

          {/* Role — 2 side-by-side cards, always visible */}
          <Field label="Register as">
            <View style={styles.roleRow}>
              <RoleCard
                title="Driver"
                subtitle="Offer rides"
                iconName="truck"
                active={fields.role === "Driver"}
                onPress={() => change("role", "Driver")}
              />
              <RoleCard
                title="Passenger"
                subtitle="Find rides"
                iconName="briefcase"
                active={fields.role === "Passenger"}
                onPress={() => change("role", "Passenger")}
              />
            </View>
          </Field>

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
                    Creating account…
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
                    Create Account
                  </Text>
                  <Feather name="arrow-right" size={18} color="white" />
                </>
              )}
            </LinearGradient>
          </Pressable>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 18,
            }}
          >
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>
              Already have an account?{" "}
            </Text>
            <Pressable onPress={() => navigation.replace("Login")} hitSlop={6}>
              <Text
                style={{ color: COLORS.primary, fontSize: 13, fontWeight: "700" }}
              >
                Login
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Footer */}
        <View style={{ alignItems: "center", marginTop: 24 }}>
          <View
            style={{
              height: 3,
              width: 48,
              borderRadius: 999,
              backgroundColor: COLORS.accent,
            }}
          />
          <Text style={{ marginTop: 8, color: COLORS.muted, fontSize: 11 }}>
            Safe • Verified • Trusted
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

type FeatherName = React.ComponentProps<typeof Feather>["name"];

interface InputProps {
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
  secureTextEntry?: boolean;
  maxLength?: number;
  mono?: boolean;
  trailing?: React.ReactNode;
}

function Input({
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
  secureTextEntry,
  maxLength,
  mono,
  trailing,
}: InputProps) {
  const borderColor = hasError
    ? "#F87171"
    : focused
    ? COLORS.secondary
    : "transparent";
  const iconColor = hasError ? "#DC2626" : focused ? COLORS.secondary : COLORS.muted;

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
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        style={{
          flex: 1,
          fontSize: 14,
          color: COLORS.labelDark,
          fontFamily: mono ? (Platform.OS === "ios" ? "Menlo" : "monospace") : undefined,
          letterSpacing: mono ? 0.5 : 0,
          paddingVertical: 0,
        }}
      />
      {trailing ? <View style={{ marginLeft: 8 }}>{trailing}</View> : null}
    </View>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  hintIcon,
  hintTone = "muted",
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  hintIcon?: FeatherName;
  hintTone?: "muted" | "info" | "success";
  children: React.ReactNode;
}) {
  const hintColor =
    hintTone === "info"
      ? COLORS.secondary
      : hintTone === "success"
      ? COLORS.successText
      : COLORS.muted;

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
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 }}
        >
          <Feather name="alert-circle" size={11} color={COLORS.danger} />
          <Text style={{ fontSize: 11, color: COLORS.danger }}>{error}</Text>
        </View>
      ) : hint ? (
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 }}
        >
          {hintIcon ? <Feather name={hintIcon} size={11} color={hintColor} /> : null}
          <Text style={{ fontSize: 11, color: hintColor }}>{hint}</Text>
        </View>
      ) : null}
    </View>
  );
}

function GenderCard({
  label,
  iconName,
  active,
  onPress,
}: {
  label: string;
  iconName: FeatherName;
  active: boolean;
  onPress: () => void;
}) {
  const fg = active ? "white" : COLORS.pillIdleText;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.genderCard,
        active ? styles.genderCardActive : styles.genderCardIdle,
      ]}
    >
      <Feather name={iconName} size={20} color={fg} />
      <Text
        numberOfLines={1}
        style={[styles.genderCardLabel, { color: fg }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function RoleCard({
  title,
  subtitle,
  iconName,
  active,
  onPress,
}: {
  title: string;
  subtitle: string;
  iconName: FeatherName;
  active: boolean;
  onPress: () => void;
}) {
  const fg = active ? "white" : COLORS.labelDark;
  const subFg = active ? "rgba(255,255,255,0.8)" : COLORS.muted;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.roleCard,
        active ? styles.roleCardActive : styles.roleCardIdle,
      ]}
    >
      <View
        style={[
          styles.roleIconCircle,
          {
            backgroundColor: active
              ? "rgba(255,255,255,0.15)"
              : "rgba(20,83,45,0.08)",
          },
        ]}
      >
        <Feather
          name={iconName}
          size={20}
          color={active ? "white" : COLORS.primary}
        />
      </View>
      <Text style={[styles.roleCardTitle, { color: fg }]}>{title}</Text>
      <Text style={[styles.roleCardSubtitle, { color: subFg }]}>{subtitle}</Text>
      {active ? (
        <View style={styles.roleCheck}>
          <Feather name="check" size={12} color={COLORS.primary} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  genderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  genderCard: {
    width: "32%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  genderCardIdle: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  genderCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    transform: [{ scale: 1.03 }],
  },
  genderCardLabel: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
  },
  roleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roleCard: {
    width: "48.5%",
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: "flex-start",
    borderWidth: 1.5,
    position: "relative",
  },
  roleCardIdle: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  roleCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    transform: [{ scale: 1.02 }],
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  roleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  roleCardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  roleCardSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  roleCheck: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
});
