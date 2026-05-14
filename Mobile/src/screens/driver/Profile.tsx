import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  getMyProfile,
  requestEmailChangeOtp,
  updateMyProfile,
  type MyProfile,
} from "@/api/api";
import type { DriverStackParamList } from "@/navigation/DriverStack";
import { useAuth } from "@/auth/AuthContext";
import { COLORS } from "@/theme/colors";
import { parseBackendDate } from "@/utils/datetime";
import FollowSaffar from "@/components/FollowSaffar";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

function absoluteMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = API_BASE.replace(/\/+$/, "");
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${base}${rel}`;
}

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|heic)$/i.test(url.split("?")[0] ?? "");
}

function initialsFrom(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtDOB(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseBackendDate(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", {
    timeZone: "Asia/Karachi",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Nav = NativeStackNavigationProp<DriverStackParamList>;

export default function DriverProfile() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{
    title: string;
    url: string;
  } | null>(null);

  // Edit-profile modal state
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "", // YYYY-MM-DD
    gender: "",
  });

  const openEdit = useCallback(() => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName ?? "",
      email: profile.email ?? "",
      phoneNumber: profile.phoneNumber ?? "",
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split("T")[0] : "",
      gender: profile.gender ?? "",
    });
    setSaveError(null);
    setEditOpen(true);
  }, [profile]);

  const saveProfile = useCallback(async () => {
    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const phoneNumber = form.phoneNumber.trim();
    const dateOfBirth = form.dateOfBirth.trim();

    if (!fullName) {
      setSaveError("Full name is required");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSaveError("Enter a valid email");
      return;
    }
    if (phoneNumber && !/^03\d{9}$/.test(phoneNumber)) {
      setSaveError("Phone must be 03XXXXXXXXX (11 digits)");
      return;
    }
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      setSaveError("Date of birth must be in YYYY-MM-DD format");
      return;
    }

    const currentEmail = (profile?.email ?? "").trim().toLowerCase();
    const emailChanged = !!email && email !== currentEmail;

    setSaving(true);
    setSaveError(null);
    try {
      // Save the non-email fields first. Email is intentionally excluded
      // from this call — it can only change via the OTP-verified flow below
      // so the user can't update email without proving they own the new
      // address.
      await updateMyProfile({
        fullName,
        phoneNumber: phoneNumber || undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender: form.gender || undefined,
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              fullName,
              phoneNumber: phoneNumber || prev.phoneNumber,
              dateOfBirth: dateOfBirth ? `${dateOfBirth}T00:00:00` : prev.dateOfBirth,
              gender: form.gender || prev.gender,
            }
          : prev
      );

      if (emailChanged) {
        // Issue an OTP to the NEW address and hand off to the verify screen.
        // The actual email swap happens in the backend only after the user
        // proves possession by entering the code.
        await requestEmailChangeOtp(email);
        setEditOpen(false);
        navigation.navigate("VerifyEmailChange", { newEmail: email });
        return;
      }

      setEditOpen(false);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (err: any) {
      // Backend uses 429 with retryAfterSeconds for OTP rate-limiting.
      const retryAfter = err?.response?.data?.retryAfterSeconds;
      const baseMsg =
        err?.response?.data?.message ??
        (typeof err?.response?.data === "string" ? err.response.data : null) ??
        err?.message ??
        "Failed to save. Please try again.";
      const msg =
        typeof baseMsg === "string"
          ? retryAfter
            ? `${baseMsg} (try again in ${retryAfter}s)`
            : baseMsg
          : "Failed to save.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }, [form, profile, navigation]);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const data = await getMyProfile();
        setProfile(data);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ??
          err?.message ??
          "Could not load profile.";
        setError(typeof msg === "string" ? msg : "Could not load profile.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      load("initial");
    }, [load])
  );

  const confirmLogout = () => {
    Alert.alert("Sign out?", "You'll need to log in again to continue.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          logout().catch(() => {});
        },
      },
    ]);
  };

  const openDocument = (title: string, path: string | null) => {
    const url = absoluteMediaUrl(path);
    if (!url) {
      Alert.alert("Not uploaded", `${title} hasn't been uploaded yet.`);
      return;
    }
    if (isImageUrl(url)) {
      setViewer({ title, url });
    } else {
      Linking.openURL(url).catch(() =>
        Alert.alert("Unable to open", `Couldn't open ${title}.`)
      );
    }
  };

  const name = profile?.fullName ?? user?.fullName ?? "—";
  const role = profile?.role ?? user?.role ?? "Driver";
  const verified = profile?.isVerified ?? user?.isVerified ?? false;
  const status = profile?.status ?? user?.status ?? "Pending";
  const profileComplete =
    profile?.isProfileComplete ?? user?.isProfileComplete ?? false;
  const rating = profile?.rating ?? 0;
  const avatarUrl = absoluteMediaUrl(profile?.profileImageUrl);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header gradient + profile card overlap */}
      <LinearGradient
        colors={[COLORS.primaryMid, COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 60,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 22,
              fontWeight: "800",
              letterSpacing: -0.3,
            }}
          >
            Profile
          </Text>
          <Pressable
            onPress={() => load("refresh")}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.12)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.22)",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <MaterialIcons name="refresh" size={18} color="white" />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, marginTop: -48 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 110,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load("refresh")}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
      >
        {/* TOP PROFILE CARD */}
        <View
          style={{
            borderRadius: 20,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: COLORS.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 9,
          }}
        >
          <LinearGradient
            colors={[COLORS.card, COLORS.cardAlt]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 18, alignItems: "center" }}
          >
            {/* Avatar */}
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: COLORS.accentSoft,
                borderWidth: 2,
                borderColor: COLORS.accentEdge,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                shadowColor: COLORS.accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Text
                  style={{
                    color: COLORS.accent,
                    fontSize: 32,
                    fontWeight: "800",
                  }}
                >
                  {initialsFrom(name)}
                </Text>
              )}
            </View>

            {/* Name */}
            <Text
              style={{
                color: COLORS.textLight,
                fontSize: 20,
                fontWeight: "800",
                marginTop: 12,
                letterSpacing: -0.3,
              }}
              numberOfLines={1}
            >
              {name}
            </Text>

            {/* Role + Verified */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: COLORS.accentSoft,
                  borderWidth: 1,
                  borderColor: COLORS.accentEdge,
                }}
              >
                <MaterialIcons
                  name="directions-car"
                  size={12}
                  color={COLORS.accent}
                />
                <Text
                  style={{
                    color: COLORS.accent,
                    fontSize: 11,
                    fontWeight: "800",
                    letterSpacing: 0.3,
                  }}
                >
                  {role.toUpperCase()}
                </Text>
              </View>
              {verified ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: "rgba(59,130,246,0.18)",
                    borderWidth: 1,
                    borderColor: "rgba(59,130,246,0.50)",
                  }}
                >
                  <MaterialIcons name="verified" size={12} color="#60A5FA" />
                  <Text
                    style={{
                      color: "#60A5FA",
                      fontSize: 11,
                      fontWeight: "800",
                      letterSpacing: 0.3,
                    }}
                  >
                    VERIFIED
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: "rgba(245,158,11,0.15)",
                    borderWidth: 1,
                    borderColor: "rgba(245,158,11,0.45)",
                  }}
                >
                  <MaterialIcons
                    name="hourglass-empty"
                    size={12}
                    color={COLORS.amber}
                  />
                  <Text
                    style={{
                      color: COLORS.amber,
                      fontSize: 11,
                      fontWeight: "800",
                      letterSpacing: 0.3,
                    }}
                  >
                    UNVERIFIED
                  </Text>
                </View>
              )}
            </View>

            {/* Rating */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 10,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "rgba(0,0,0,0.22)",
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <MaterialIcons name="star" size={14} color="#FBBF24" />
              <Text
                style={{
                  color: COLORS.textLight,
                  fontSize: 13,
                  fontWeight: "800",
                }}
              >
                {rating.toFixed(1)}
              </Text>
              <Text
                style={{
                  color: COLORS.textMuted,
                  fontSize: 11,
                  fontWeight: "600",
                  marginLeft: 4,
                }}
              >
                rating
              </Text>
            </View>
          </LinearGradient>
        </View>

        {loading ? (
          <View
            style={{
              paddingVertical: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator color={COLORS.accent} />
            <Text
              style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 8 }}
            >
              Loading profile…
            </Text>
          </View>
        ) : error ? (
          <SectionCard title="Profile" icon="error-outline">
            <Text
              style={{ color: COLORS.dangerText, fontSize: 13, marginBottom: 10 }}
            >
              {error}
            </Text>
            <Pressable
              onPress={() => load("initial")}
              style={({ pressed }) => ({
                alignSelf: "flex-start",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: COLORS.accent,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: "white", fontSize: 12, fontWeight: "800" }}>
                Try again
              </Text>
            </Pressable>
          </SectionCard>
        ) : (
          <>
            {/* PERSONAL INFO */}
            <SectionCard title="Personal Info" icon="person">
              <InfoRow icon="badge" label="Full Name" value={profile?.fullName} />
              <InfoRow icon="email" label="Email" value={profile?.email} />
              <InfoRow
                icon="phone"
                label="Phone"
                value={profile?.phoneNumber}
              />
              <InfoRow
                icon="credit-card"
                label="CNIC"
                value={profile?.cnic ?? "—"}
                locked
              />
              <InfoRow
                icon="cake"
                label="Date of Birth"
                value={fmtDOB(profile?.dateOfBirth)}
              />
              <InfoRow
                icon="wc"
                label="Gender"
                value={profile?.gender ?? "—"}
                isLast
              />

              <Pressable
                onPress={openEdit}
                style={({ pressed }) => ({
                  marginTop: 14,
                  borderRadius: 12,
                  overflow: "hidden",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <LinearGradient
                  colors={[COLORS.accent, "#16A34A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 12,
                  }}
                >
                  <MaterialIcons name="edit" size={16} color="white" />
                  <Text
                    style={{ color: "white", fontSize: 14, fontWeight: "800" }}
                  >
                    Edit Profile
                  </Text>
                </LinearGradient>
              </Pressable>
            </SectionCard>

            {/* VERIFICATION DOCUMENTS */}
            <SectionCard title="Verification Documents" icon="verified-user">
              <DocumentRow
                icon="face"
                label="Profile Photo"
                path={profile?.profileImageUrl ?? null}
                onView={() =>
                  openDocument("Profile Photo", profile?.profileImageUrl ?? null)
                }
              />
              <DocumentRow
                icon="credit-card"
                label="CNIC Image"
                path={profile?.cnicImageUrl ?? null}
                onView={() =>
                  openDocument("CNIC Image", profile?.cnicImageUrl ?? null)
                }
              />
              <DocumentRow
                icon="drive-eta"
                label="Driving License"
                path={profile?.licenseImageUrl ?? null}
                onView={() =>
                  openDocument(
                    "Driving License",
                    profile?.licenseImageUrl ?? null
                  )
                }
                isLast
              />
            </SectionCard>

            {/* STATUS INFO */}
            <SectionCard title="Account Status" icon="security">
              <StatusRow
                icon={status === "Approved" ? "check-circle" : "schedule"}
                label="Approval Status"
                value={status === "Approved" ? "Approved" : status ?? "Pending"}
                tone={
                  status === "Approved"
                    ? "success"
                    : status === "Rejected"
                      ? "danger"
                      : "warn"
                }
              />
              <StatusRow
                icon={profileComplete ? "task-alt" : "radio-button-unchecked"}
                label="Profile Complete"
                value={profileComplete ? "Yes" : "No"}
                tone={profileComplete ? "success" : "warn"}
                isLast
              />
            </SectionCard>

            {/* SOCIAL */}
            <FollowSaffar />

            {/* LOGOUT */}
            <Pressable
              onPress={confirmLogout}
              style={({ pressed }) => ({
                marginTop: 4,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: "#EF4444",
                backgroundColor: "rgba(239,68,68,0.08)",
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <MaterialIcons name="logout" size={18} color="#F87171" />
              <Text
                style={{
                  color: "#F87171",
                  fontSize: 14,
                  fontWeight: "800",
                  letterSpacing: 0.3,
                }}
              >
                Sign Out
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* DOCUMENT VIEWER MODAL */}
      <Modal
        visible={viewer !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewer(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.92)",
          }}
        >
          <View
            style={{
              paddingTop: insets.top + 8,
              paddingHorizontal: 16,
              paddingBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{ color: "white", fontSize: 16, fontWeight: "800" }}
              numberOfLines={1}
            >
              {viewer?.title}
            </Text>
            <Pressable
              onPress={() => setViewer(null)}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(255,255,255,0.12)",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <MaterialIcons name="close" size={20} color="white" />
            </Pressable>
          </View>
          {viewer ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 16,
                paddingBottom: insets.bottom + 24,
              }}
            >
              <Image
                source={{ uri: viewer.url }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            </View>
          ) : null}
        </View>
      </Modal>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={editOpen}
        transparent
        animationType="slide"
        onRequestClose={() => (saving ? null : setEditOpen(false))}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}
        >
          <Pressable
            onPress={() => (saving ? null : setEditOpen(false))}
            style={{ flex: 1 }}
          />
          <View
            style={{
              backgroundColor: COLORS.bg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
              paddingBottom: insets.bottom + 16,
              maxHeight: "92%",
            }}
          >
            {/* Drag handle */}
            <View style={{ alignItems: "center", paddingTop: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "rgba(255,255,255,0.25)",
                }}
              />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingTop: 14,
                paddingBottom: 8,
              }}
            >
              <View>
                <Text style={{ color: "white", fontSize: 20, fontWeight: "800", letterSpacing: -0.3 }}>
                  Edit Profile
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
                  Update your personal information
                </Text>
              </View>
              <Pressable
                onPress={() => (saving ? null : setEditOpen(false))}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : saving ? 0.4 : 1,
                })}
              >
                <MaterialIcons name="close" size={18} color="white" />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 20, gap: 14 }}
              showsVerticalScrollIndicator={false}
            >
              <FieldLabel icon="badge" label="Full Name" />
              <FieldInput
                value={form.fullName}
                onChangeText={(v) => setForm((f) => ({ ...f, fullName: v }))}
                placeholder="e.g. Waqas Azam"
                autoCapitalize="words"
                editable={!saving}
              />

              <FieldLabel icon="email" label="Email" />
              <FieldInput
                value={form.email}
                onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!saving}
              />
              {form.email.trim().toLowerCase() !==
                (profile?.email ?? "").trim().toLowerCase() && form.email.trim() ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginTop: -6,
                  }}
                >
                  <MaterialIcons name="info-outline" size={12} color={COLORS.textDim} />
                  <Text style={{ color: COLORS.textDim, fontSize: 11.5 }}>
                    We'll send a 6-digit code to verify the new address.
                  </Text>
                </View>
              ) : null}

              <FieldLabel icon="phone" label="Phone" />
              <FieldInput
                value={form.phoneNumber}
                onChangeText={(v) => setForm((f) => ({ ...f, phoneNumber: v }))}
                placeholder="03XXXXXXXXX"
                keyboardType="phone-pad"
                maxLength={11}
                editable={!saving}
              />

              <FieldLabel icon="cake" label="Date of Birth" />
              <FieldInput
                value={form.dateOfBirth}
                onChangeText={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                editable={!saving}
              />

              <FieldLabel icon="wc" label="Gender" />
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["Male", "Female", "Other"] as const).map((g) => {
                  const active = form.gender === g;
                  return (
                    <Pressable
                      key={g}
                      onPress={() => !saving && setForm((f) => ({ ...f, gender: g }))}
                      style={({ pressed }) => ({
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: active ? COLORS.accentSoft : "rgba(255,255,255,0.05)",
                        borderWidth: 1,
                        borderColor: active ? COLORS.accentEdge : "rgba(255,255,255,0.1)",
                        opacity: pressed ? 0.75 : 1,
                      })}
                    >
                      <Text
                        style={{
                          color: active ? COLORS.accent : COLORS.textMuted,
                          fontSize: 13,
                          fontWeight: "800",
                          letterSpacing: 0.2,
                        }}
                      >
                        {g}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* CNIC notice */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  marginTop: 4,
                }}
              >
                <MaterialIcons name="lock" size={14} color={COLORS.textMuted} />
                <Text style={{ color: COLORS.textMuted, fontSize: 11.5, flex: 1 }}>
                  CNIC is locked. Contact admin to change verified information.
                </Text>
              </View>

              {/* Inline error */}
              {saveError ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: "rgba(239,68,68,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(239,68,68,0.4)",
                  }}
                >
                  <MaterialIcons name="error-outline" size={14} color="#FCA5A5" />
                  <Text style={{ color: "#FCA5A5", fontSize: 12, fontWeight: "600", flex: 1 }}>
                    {saveError}
                  </Text>
                </View>
              ) : null}

              {/* Save button */}
              <View
                style={{
                  marginTop: 6,
                  shadowColor: COLORS.accent,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <Pressable
                  onPress={saveProfile}
                  disabled={saving}
                  style={({ pressed }) => ({
                    borderRadius: 14,
                    overflow: "hidden",
                    opacity: saving ? 0.7 : 1,
                    transform: [{ scale: pressed && !saving ? 0.97 : 1 }],
                  })}
                >
                  <LinearGradient
                    colors={[COLORS.accent, "#16A34A"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      paddingVertical: 14,
                    }}
                  >
                    {saving ? (
                      <>
                        <ActivityIndicator color="white" size="small" />
                        <Text style={{ color: "white", fontSize: 14.5, fontWeight: "800", letterSpacing: 0.3 }}>
                          Saving…
                        </Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcons name="check" size={18} color="white" />
                        <Text style={{ color: "white", fontSize: 14.5, fontWeight: "800", letterSpacing: 0.3 }}>
                          Save Changes
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function FieldLabel({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <MaterialIcons name={icon} size={13} color={COLORS.textDim} />
      <Text
        style={{
          color: COLORS.textDim,
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 0.5,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function FieldInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="rgba(255,255,255,0.30)"
      {...props}
      style={[
        {
          backgroundColor: "rgba(255,255,255,0.05)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: "white",
          fontSize: 14,
          fontWeight: "600",
        },
        props.style,
      ]}
    />
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: IconName;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
        elevation: 7,
      }}
    >
      <LinearGradient
        colors={[COLORS.card, COLORS.cardAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: COLORS.accentSoft,
              borderWidth: 1,
              borderColor: COLORS.accentEdge,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name={icon} size={16} color={COLORS.accent} />
          </View>
          <Text
            style={{
              color: COLORS.textLight,
              fontSize: 15,
              fontWeight: "800",
              letterSpacing: -0.2,
            }}
          >
            {title}
          </Text>
        </View>
        {children}
      </LinearGradient>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  locked,
  isLast,
}: {
  icon: IconName;
  label: string;
  value: string | null | undefined;
  locked?: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "rgba(4,120,87,0.35)",
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: "rgba(0,0,0,0.22)",
          borderWidth: 1,
          borderColor: COLORS.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name={icon} size={14} color={COLORS.textDim} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: COLORS.textDim,
            fontSize: 10.5,
            fontWeight: "800",
            letterSpacing: 0.3,
          }}
        >
          {label.toUpperCase()}
        </Text>
        <Text
          style={{
            color: COLORS.textLight,
            fontSize: 14,
            fontWeight: "700",
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {value ?? "—"}
        </Text>
      </View>
      {locked ? (
        <MaterialIcons name="lock" size={14} color={COLORS.textMuted} />
      ) : null}
    </View>
  );
}

function DocumentRow({
  icon,
  label,
  path,
  onView,
  isLast,
}: {
  icon: IconName;
  label: string;
  path: string | null;
  onView: () => void;
  isLast?: boolean;
}) {
  const uploaded = !!path;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "rgba(4,120,87,0.35)",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: uploaded
            ? COLORS.accentSoft
            : "rgba(245,158,11,0.12)",
          borderWidth: 1,
          borderColor: uploaded
            ? COLORS.accentEdge
            : "rgba(245,158,11,0.40)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons
          name={icon}
          size={18}
          color={uploaded ? COLORS.accent : COLORS.amber}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: COLORS.textLight,
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: uploaded ? COLORS.textDim : COLORS.amber,
            fontSize: 11,
            fontWeight: "700",
            marginTop: 2,
          }}
        >
          {uploaded ? "Uploaded" : "Not uploaded"}
        </Text>
      </View>
      <Pressable
        onPress={onView}
        disabled={!uploaded}
        style={({ pressed }) => ({
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 10,
          backgroundColor: uploaded
            ? "rgba(34,197,94,0.14)"
            : "rgba(255,255,255,0.04)",
          borderWidth: 1,
          borderColor: uploaded ? COLORS.accentEdge : COLORS.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          opacity: !uploaded ? 0.5 : pressed ? 0.6 : 1,
          transform: [{ scale: pressed && uploaded ? 0.96 : 1 }],
        })}
      >
        <MaterialIcons
          name="visibility"
          size={12}
          color={uploaded ? COLORS.accent : COLORS.textMuted}
        />
        <Text
          style={{
            color: uploaded ? COLORS.accent : COLORS.textMuted,
            fontSize: 11,
            fontWeight: "800",
          }}
        >
          View
        </Text>
      </Pressable>
    </View>
  );
}

function StatusRow({
  icon,
  label,
  value,
  tone,
  isLast,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone: "success" | "warn" | "danger";
  isLast?: boolean;
}) {
  const palette =
    tone === "success"
      ? {
          fg: COLORS.accent,
          bg: COLORS.accentSoft,
          border: COLORS.accentEdge,
        }
      : tone === "danger"
        ? {
            fg: "#F87171",
            bg: "rgba(239,68,68,0.15)",
            border: "rgba(239,68,68,0.45)",
          }
        : {
            fg: COLORS.amber,
            bg: "rgba(245,158,11,0.15)",
            border: "rgba(245,158,11,0.45)",
          };
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "rgba(4,120,87,0.35)",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: palette.bg,
          borderWidth: 1,
          borderColor: palette.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name={icon} size={18} color={palette.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: COLORS.textDim,
            fontSize: 10.5,
            fontWeight: "800",
            letterSpacing: 0.3,
          }}
        >
          {label.toUpperCase()}
        </Text>
        <Text
          style={{
            color: palette.fg,
            fontSize: 14,
            fontWeight: "800",
            marginTop: 2,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
