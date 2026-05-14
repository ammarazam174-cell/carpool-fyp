import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { deleteVehicle, listMyVehicles, type VehicleDto } from "@/api/api";
import { COLORS } from "@/theme/colors";
import type { DriverStackParamList } from "@/navigation/DriverStack";

type Nav = NativeStackNavigationProp<DriverStackParamList, "MyVehicles">;

type ParsedVehicle = {
  id: string;
  name: string;        // "Honda Civic"
  year: string;        // "2024"
  plate: string;       // "ABC-123"
  seats: number;       // 4
  color: string;       // "White"
  isDefault: boolean;
};

// AddVehicle encodes extra fields into `model` as: "YEAR ModelCore · Color".
// Reverse that so the UI can show Year / Color as first-class rows.
function parseVehicle(v: VehicleDto): ParsedVehicle {
  const model = (v.model ?? "").trim();
  let year = "";
  let color = "";
  let modelCore = model;

  // Split off color suffix " · White"
  const dotIdx = model.lastIndexOf(" · ");
  if (dotIdx !== -1) {
    color = model.slice(dotIdx + 3).trim();
    modelCore = model.slice(0, dotIdx).trim();
  }
  // Peel off leading year token
  const firstSpace = modelCore.indexOf(" ");
  if (firstSpace !== -1) {
    const head = modelCore.slice(0, firstSpace);
    if (/^\d{4}$/.test(head)) {
      year = head;
      modelCore = modelCore.slice(firstSpace + 1).trim();
    }
  } else if (/^\d{4}$/.test(modelCore)) {
    year = modelCore;
    modelCore = "";
  }

  const name = [v.make, modelCore].filter(Boolean).join(" ").trim() || v.make;

  return {
    id: v.id,
    name,
    year,
    plate: v.plateNumber,
    seats: v.seats,
    color,
    isDefault: v.isDefault,
  };
}

export default function MyVehicles() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const [vehicles, setVehicles] = useState<ParsedVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const list = await listMyVehicles();
      setVehicles(list.map(parseVehicle));
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        "Could not load vehicles.";
      setError(typeof msg === "string" ? msg : "Could not load vehicles.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load("initial");
    }, [load])
  );

  const onDelete = (v: ParsedVehicle) => {
    Alert.alert(
      "Delete vehicle?",
      `${v.name} · ${v.plate} will be removed from your account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(v.id);
            try {
              await deleteVehicle(v.id);
              setVehicles((prev) => prev.filter((x) => x.id !== v.id));
            } catch (err: any) {
              const msg =
                err?.response?.data?.message ??
                err?.message ??
                "Could not delete vehicle.";
              Alert.alert("Delete failed", typeof msg === "string" ? msg : "Could not delete vehicle.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* HEADER */}
      <LinearGradient
        colors={[COLORS.primaryMid, COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 20,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <MaterialIcons name="arrow-back" size={20} color="white" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "white",
                fontSize: 22,
                fontWeight: "800",
                letterSpacing: -0.3,
              }}
            >
              My Vehicles
            </Text>
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 12,
                marginTop: 2,
              }}
            >
              Manage your vehicles
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("AddVehicle", { mode: "normal" })}
            hitSlop={8}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: COLORS.accent,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <MaterialIcons name="add" size={16} color="white" />
            <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>
              Add
            </Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* BODY */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 10 }}>
            Loading your vehicles…
          </Text>
        </View>
      ) : error ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load("refresh")}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
        >
          <View
            style={{
              padding: 14,
              borderRadius: 14,
              backgroundColor: COLORS.dangerBg,
              borderWidth: 1,
              borderColor: COLORS.dangerBorder,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <MaterialIcons name="error-outline" size={20} color={COLORS.dangerText} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.dangerText, fontSize: 14, fontWeight: "700" }}>
                Couldn't load vehicles
              </Text>
              <Text style={{ color: COLORS.dangerText, fontSize: 12, marginTop: 4 }}>
                {error}
              </Text>
              <Pressable
                onPress={() => load("initial")}
                style={({ pressed }) => ({
                  marginTop: 10,
                  alignSelf: "flex-start",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: COLORS.accent,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>
                  Try again
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      ) : vehicles.length === 0 ? (
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 16,
            paddingBottom: insets.bottom + 24,
            justifyContent: "center",
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load("refresh")}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
        >
          <EmptyState onAdd={() => navigation.navigate("AddVehicle", { mode: "normal" })} />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 96,
            gap: 12,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load("refresh")}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
        >
          {vehicles.map((v) => (
            <VehicleCard
              key={v.id}
              v={v}
              busy={deletingId === v.id}
              onDelete={() => onDelete(v)}
            />
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      {!loading && vehicles.length > 0 ? (
        <Pressable
          onPress={() => navigation.navigate("AddVehicle", { mode: "normal" })}
          style={({ pressed }) => ({
            position: "absolute",
            right: 16,
            bottom: insets.bottom + 20,
            borderRadius: 999,
            overflow: "hidden",
            transform: [{ scale: pressed ? 0.96 : 1 }],
            shadowColor: COLORS.accent,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.45,
            shadowRadius: 14,
            elevation: 10,
          })}
        >
          <LinearGradient
            colors={[COLORS.accent, "#16A34A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 18,
              paddingVertical: 14,
            }}
          >
            <MaterialIcons name="add" size={20} color="white" />
            <Text style={{ color: "white", fontSize: 14, fontWeight: "800" }}>
              Add Vehicle
            </Text>
          </LinearGradient>
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 28,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: COLORS.accentSoft,
          borderWidth: 1,
          borderColor: COLORS.accentEdge,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <MaterialIcons name="directions-car" size={36} color={COLORS.accent} />
      </View>
      <Text
        style={{
          color: COLORS.textLight,
          fontSize: 18,
          fontWeight: "800",
          letterSpacing: -0.3,
        }}
      >
        No vehicles yet
      </Text>
      <Text
        style={{
          color: COLORS.textMuted,
          fontSize: 13,
          marginTop: 6,
          textAlign: "center",
          maxWidth: 260,
        }}
      >
        Add your first vehicle to start creating rides
      </Text>
      <Pressable
        onPress={onAdd}
        style={({ pressed }) => ({
          marginTop: 18,
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
            gap: 6,
            paddingHorizontal: 22,
            paddingVertical: 12,
          }}
        >
          <MaterialIcons name="add" size={18} color="white" />
          <Text style={{ color: "white", fontSize: 14, fontWeight: "800" }}>
            Add Vehicle
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function VehicleCard({
  v,
  busy,
  onDelete,
}: {
  v: ParsedVehicle;
  busy: boolean;
  onDelete: () => void;
}) {
  return (
    <View
      style={{
        borderRadius: 18,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <LinearGradient
        colors={[COLORS.card, COLORS.cardAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: COLORS.accentSoft,
              borderWidth: 1,
              borderColor: COLORS.accentEdge,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="directions-car" size={30} color={COLORS.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text
                style={{
                  color: COLORS.textLight,
                  fontSize: 17,
                  fontWeight: "800",
                  letterSpacing: -0.2,
                }}
                numberOfLines={1}
              >
                {v.name}
              </Text>
              {v.isDefault ? (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor: COLORS.accentSoft,
                    borderWidth: 1,
                    borderColor: COLORS.accentEdge,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.accent,
                      fontSize: 10,
                      fontWeight: "800",
                      letterSpacing: 0.3,
                    }}
                  >
                    DEFAULT
                  </Text>
                </View>
              ) : null}
            </View>
            {v.year ? (
              <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
                {v.year}
              </Text>
            ) : null}
          </View>
        </View>

        <View
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            backgroundColor: "rgba(0,0,0,0.2)",
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 8,
          }}
        >
          <Row icon="confirmation-number" label="Registration" value={v.plate} mono />
          <Row icon="event-seat" label="Seats" value={`${v.seats} seats`} />
          {v.color ? <Row icon="palette" label="Color" value={v.color} /> : null}
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <Pressable
            onPress={onDelete}
            disabled={busy}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 11,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.dangerBorder,
              backgroundColor: COLORS.dangerBg,
              opacity: busy ? 0.55 : pressed ? 0.75 : 1,
            })}
          >
            {busy ? (
              <ActivityIndicator size="small" color={COLORS.dangerText} />
            ) : (
              <MaterialIcons name="delete-outline" size={16} color={COLORS.dangerText} />
            )}
            <Text
              style={{ color: COLORS.dangerText, fontSize: 13, fontWeight: "700" }}
            >
              {busy ? "Deleting…" : "Delete"}
            </Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <MaterialIcons name={icon} size={16} color={COLORS.textDim} />
      <Text
        style={{
          color: COLORS.textMuted,
          fontSize: 12,
          fontWeight: "600",
          width: 92,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: COLORS.textLight,
          fontSize: 13,
          fontWeight: "700",
          flex: 1,
          letterSpacing: mono ? 0.5 : 0,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
