import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useFocusEffect,
  CommonActions,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  createRide,
  listMyVehicles,
  type VehicleDto,
} from "@/api/api";
import type { DriverStackParamList } from "@/navigation/DriverStack";
import { COLORS } from "@/theme/colors";

const FIXED_FARE = 1200;
const CITIES = ["Karachi", "Hyderabad"] as const;
const MAX_SEATS = 8;

type Nav = NativeStackNavigationProp<DriverStackParamList, "CreateRide">;

export default function CreateRide() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();

  const [step, setStep] = useState<1 | 2>(1);
  const fade = useRef(new Animated.Value(1)).current;

  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);

  const [vehicleId, setVehicleId] = useState("");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [dateTime, setDateTime] = useState<Date | null>(null);
  const [seats, setSeats] = useState(1);
  const [pickupStops, setPickupStops] = useState<string[]>([]);
  const [dropoffStops, setDropoffStops] = useState<string[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [vehicleSheetOpen, setVehicleSheetOpen] = useState(false);
  const [fromSheetOpen, setFromSheetOpen] = useState(false);
  const [toSheetOpen, setToSheetOpen] = useState(false);
  const [dtSheetOpen, setDtSheetOpen] = useState(false);

  const loadVehicles = useCallback(async () => {
    setLoadingVehicles(true);
    setVehiclesError(null);
    try {
      const list = await listMyVehicles();
      console.log("[CreateRide] Vehicles:", list.length, list);
      setVehicles(list);
    } catch (err: any) {
      const status = err?.response?.status;
      const payload = err?.response?.data;
      const msg =
        (typeof payload === "string" ? payload : payload?.message) ??
        err?.message ??
        "Failed to load vehicles";
      console.error("[CreateRide] Vehicles fetch failed:", status, msg, err);
      setVehiclesError(String(msg));
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  }, []);

  // Refetch whenever screen regains focus (e.g. after adding a vehicle).
  useFocusEffect(
    useCallback(() => {
      void loadVehicles();
    }, [loadVehicles])
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? null,
    [vehicles, vehicleId]
  );

  const transitionTo = (next: 1 | 2) => {
    Animated.timing(fade, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      Animated.timing(fade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!vehicleId) e.vehicle = "Please select a vehicle.";
    if (!fromCity) e.from = "Please select origin city.";
    if (!toCity) e.to = "Please select destination city.";
    if (fromCity && toCity && fromCity === toCity)
      e.to = "Origin and destination cannot be the same.";
    if (!dateTime) e.dateTime = "Please pick a departure date & time.";
    if (dateTime && dateTime.getTime() <= Date.now())
      e.dateTime = "Departure must be in the future.";
    if (seats < 1) e.seats = "At least 1 seat required.";
    if (pickupStops.some((s) => !s.trim()))
      e.pickup = "Pickup stop names cannot be empty.";
    if (dropoffStops.some((s) => !s.trim()))
      e.dropoff = "Dropoff stop names cannot be empty.";
    return e;
  };

  const handlePreview = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    transitionTo(2);
  };

  const handleConfirm = async () => {
    if (!dateTime) return;
    setSubmitting(true);
    try {
      await createRide({
        vehicleId,
        fromAddress: fromCity,
        toAddress: toCity,
        departureTime: dateTime.toISOString(),
        availableSeats: seats,
        pickupStops: pickupStops.map((s) => s.trim()).filter(Boolean),
        dropoffStops: dropoffStops.map((s) => s.trim()).filter(Boolean),
      });
      Alert.alert("Ride published", "Your ride is now live.", [
        {
          text: "OK",
          onPress: () =>
            nav.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "Tabs" }],
              })
            ),
        },
      ]);
    } catch (err: any) {
      const payload = err?.response?.data;
      const msg =
        typeof payload === "string"
          ? payload
          : payload?.message ?? err?.message ?? "Failed to create ride.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: COLORS.bg }}
    >
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primaryMid, COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 22,
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
          <Pressable
            onPress={() => (step === 2 ? transitionTo(1) : nav.goBack())}
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="chevron-left" size={22} color="white" />
          </Pressable>

          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "800",
                letterSpacing: -0.2,
              }}
            >
              {step === 1 ? "Create Ride" : "Review Your Ride"}
            </Text>
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 12,
                marginTop: 2,
              }}
            >
              {step === 1
                ? "Fill in the details below"
                : "Confirm details before publishing"}
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Step indicator */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 18,
            gap: 8,
          }}
        >
          <StepDot active filled label="1" />
          <View
            style={{
              width: 28,
              height: 2,
              borderRadius: 1,
              backgroundColor:
                step === 2 ? COLORS.accent : "rgba(255,255,255,0.25)",
            }}
          />
          <StepDot active={step === 2} filled={step === 2} label="2" />
        </View>
      </LinearGradient>

      <Animated.View style={{ flex: 1, opacity: fade }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: insets.bottom + 40,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 ? (
            <FormStep
              loadingVehicles={loadingVehicles}
              vehicles={vehicles}
              vehiclesError={vehiclesError}
              onRetryVehicles={() => void loadVehicles()}
              onAddVehicle={() => nav.navigate("AddVehicle")}
              selectedVehicle={selectedVehicle}
              onOpenVehicle={() => setVehicleSheetOpen(true)}
              fromCity={fromCity}
              toCity={toCity}
              onOpenFrom={() => setFromSheetOpen(true)}
              onOpenTo={() => setToSheetOpen(true)}
              dateTime={dateTime}
              onOpenDt={() => setDtSheetOpen(true)}
              seats={seats}
              onSeatsChange={setSeats}
              pickupStops={pickupStops}
              setPickupStops={setPickupStops}
              dropoffStops={dropoffStops}
              setDropoffStops={setDropoffStops}
              errors={errors}
              onPreview={handlePreview}
            />
          ) : (
            <PreviewStep
              fromCity={fromCity}
              toCity={toCity}
              dateTime={dateTime!}
              seats={seats}
              vehicle={selectedVehicle}
              pickupStops={pickupStops}
              dropoffStops={dropoffStops}
              submitting={submitting}
              onEdit={() => transitionTo(1)}
              onConfirm={handleConfirm}
            />
          )}
        </ScrollView>
      </Animated.View>

      {/* Pickers */}
      <PickerSheet
        visible={vehicleSheetOpen}
        title="Select Vehicle"
        onClose={() => setVehicleSheetOpen(false)}
        options={vehicles.map((v) => ({
          key: v.id,
          label: `${v.make} ${v.model}`,
          sub: v.plateNumber,
        }))}
        selectedKey={vehicleId}
        onSelect={(k) => {
          setVehicleId(k);
          setErrors((p) => ({ ...p, vehicle: "" }));
        }}
        emptyText="No vehicles found."
      />
      <PickerSheet
        visible={fromSheetOpen}
        title="From City"
        onClose={() => setFromSheetOpen(false)}
        options={CITIES.map((c) => ({ key: c, label: c }))}
        selectedKey={fromCity}
        onSelect={(k) => {
          setFromCity(k);
          setErrors((p) => ({ ...p, from: "", to: "" }));
        }}
      />
      <PickerSheet
        visible={toSheetOpen}
        title="To City"
        onClose={() => setToSheetOpen(false)}
        options={CITIES.map((c) => ({
          key: c,
          label: c,
          disabled: c === fromCity,
        }))}
        selectedKey={toCity}
        onSelect={(k) => {
          setToCity(k);
          setErrors((p) => ({ ...p, to: "" }));
        }}
      />
      <DateTimeSheet
        visible={dtSheetOpen}
        initial={dateTime}
        onClose={() => setDtSheetOpen(false)}
        onConfirm={(d) => {
          setDateTime(d);
          setErrors((p) => ({ ...p, dateTime: "" }));
        }}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Step 1: Form ──────────────────────────────────────────────────────────

type FormStepProps = {
  loadingVehicles: boolean;
  vehicles: VehicleDto[];
  vehiclesError: string | null;
  onRetryVehicles: () => void;
  onAddVehicle: () => void;
  selectedVehicle: VehicleDto | null;
  onOpenVehicle: () => void;
  fromCity: string;
  toCity: string;
  onOpenFrom: () => void;
  onOpenTo: () => void;
  dateTime: Date | null;
  onOpenDt: () => void;
  seats: number;
  onSeatsChange: (n: number) => void;
  pickupStops: string[];
  setPickupStops: (s: string[]) => void;
  dropoffStops: string[];
  setDropoffStops: (s: string[]) => void;
  errors: Record<string, string>;
  onPreview: () => void;
};

function FormStep(props: FormStepProps) {
  const {
    loadingVehicles,
    vehicles,
    vehiclesError,
    onRetryVehicles,
    onAddVehicle,
    selectedVehicle,
    onOpenVehicle,
    fromCity,
    toCity,
    onOpenFrom,
    onOpenTo,
    dateTime,
    onOpenDt,
    seats,
    onSeatsChange,
    pickupStops,
    setPickupStops,
    dropoffStops,
    setDropoffStops,
    errors,
    onPreview,
  } = props;

  const showEmptyState =
    !loadingVehicles && !vehiclesError && vehicles.length === 0;
  const showErrorState = !loadingVehicles && !!vehiclesError;

  return (
    <View>
      {/* Vehicle */}
      <FieldLabel text="Select Vehicle" />
      <SelectField
        icon="directions-car"
        placeholder={
          loadingVehicles
            ? "Loading vehicles…"
            : showErrorState
            ? "Could not load vehicles"
            : vehicles.length === 0
            ? "No vehicles available"
            : "Choose a vehicle"
        }
        value={
          selectedVehicle
            ? `${selectedVehicle.make} ${selectedVehicle.model}`
            : ""
        }
        sub={selectedVehicle?.plateNumber}
        onPress={
          loadingVehicles || vehicles.length === 0 ? undefined : onOpenVehicle
        }
        error={errors.vehicle}
      />

      {showEmptyState ? (
        <VehicleEmptyState onAddVehicle={onAddVehicle} />
      ) : null}
      {showErrorState ? (
        <VehicleErrorState
          message={vehiclesError!}
          onRetry={onRetryVehicles}
        />
      ) : null}

      {/* Route */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          <FieldLabel text="From" />
          <SelectField
            icon="my-location"
            placeholder="From city"
            value={fromCity}
            onPress={onOpenFrom}
            error={errors.from}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel text="To" />
          <SelectField
            icon="place"
            placeholder="To city"
            value={toCity}
            onPress={onOpenTo}
            error={errors.to}
          />
        </View>
      </View>

      {/* Departure */}
      <FieldLabel text="Departure Date & Time" />
      <SelectField
        icon="event"
        placeholder="Pick date & time"
        value={dateTime ? formatDateTime(dateTime) : ""}
        onPress={onOpenDt}
        error={errors.dateTime}
      />

      {/* Seats */}
      <FieldLabel text="Available Seats" />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: COLORS.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
          paddingVertical: 10,
          paddingHorizontal: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <MaterialIcons name="event-seat" size={20} color={COLORS.accent} />
          <Text style={{ color: COLORS.textLight, fontSize: 15, fontWeight: "600" }}>
            {seats} {seats === 1 ? "seat" : "seats"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <StepperBtn
            icon="remove"
            disabled={seats <= 1}
            onPress={() => onSeatsChange(Math.max(1, seats - 1))}
          />
          <StepperBtn
            icon="add"
            disabled={seats >= MAX_SEATS}
            onPress={() => onSeatsChange(Math.min(MAX_SEATS, seats + 1))}
          />
        </View>
      </View>
      {errors.seats ? <ErrorLine text={errors.seats} /> : null}

      {/* Fare */}
      <View
        style={{
          marginTop: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(34,197,94,0.10)",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "rgba(34,197,94,0.35)",
          paddingVertical: 12,
          paddingHorizontal: 14,
        }}
      >
        <View>
          <Text
            style={{
              color: COLORS.textMuted,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 0.8,
            }}
          >
            FIXED FARE
          </Text>
          <Text
            style={{
              color: COLORS.textLight,
              fontSize: 18,
              fontWeight: "800",
              marginTop: 2,
            }}
          >
            PKR {FIXED_FARE.toLocaleString()}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "rgba(34,197,94,0.18)",
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Feather name="lock" size={11} color={COLORS.accent} />
          <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: "700" }}>
            Set by admin
          </Text>
        </View>
      </View>

      {/* Pickup stops */}
      <StopsEditor
        title="Pickup Stops"
        icon="flag"
        stops={pickupStops}
        setStops={setPickupStops}
        error={errors.pickup}
      />

      {/* Dropoff stops */}
      <StopsEditor
        title="Dropoff Stops"
        icon="outlined-flag"
        stops={dropoffStops}
        setStops={setDropoffStops}
        error={errors.dropoff}
      />

      {/* Preview button */}
      <Pressable
        onPress={onPreview}
        style={({ pressed }) => ({
          marginTop: 24,
          borderRadius: 14,
          overflow: "hidden",
          transform: [{ scale: pressed ? 0.97 : 1 }],
          shadowColor: COLORS.accent,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 6,
        })}
      >
        <LinearGradient
          colors={[COLORS.accent, "#16A34A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: 54,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 }}>
            Preview Ride
          </Text>
          <Feather name="arrow-right" size={18} color="white" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ─── Step 2: Preview ───────────────────────────────────────────────────────

type PreviewStepProps = {
  fromCity: string;
  toCity: string;
  dateTime: Date;
  seats: number;
  vehicle: VehicleDto | null;
  pickupStops: string[];
  dropoffStops: string[];
  submitting: boolean;
  onEdit: () => void;
  onConfirm: () => void;
};

function PreviewStep(props: PreviewStepProps) {
  const {
    fromCity,
    toCity,
    dateTime,
    seats,
    vehicle,
    pickupStops,
    dropoffStops,
    submitting,
    onEdit,
    onConfirm,
  } = props;

  return (
    <View>
      {/* Route */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: COLORS.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
          paddingVertical: 18,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              color: COLORS.textMuted,
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 0.8,
              marginBottom: 4,
            }}
          >
            FROM
          </Text>
          <Text
            style={{
              color: COLORS.textLight,
              fontSize: 18,
              fontWeight: "800",
              letterSpacing: -0.2,
            }}
          >
            {fromCity}
          </Text>
        </View>
        <MaterialIcons
          name="arrow-forward"
          size={22}
          color={COLORS.accent}
          style={{ marginHorizontal: 8 }}
        />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              color: COLORS.textMuted,
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 0.8,
              marginBottom: 4,
            }}
          >
            TO
          </Text>
          <Text
            style={{
              color: COLORS.textLight,
              fontSize: 18,
              fontWeight: "800",
              letterSpacing: -0.2,
            }}
          >
            {toCity}
          </Text>
        </View>
      </View>

      {/* Grid */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <DetailTile
          label="Departure"
          value={formatDateTime(dateTime)}
          icon="event"
        />
        <DetailTile
          label="Seats"
          value={`${seats} ${seats === 1 ? "seat" : "seats"}`}
          icon="event-seat"
        />
      </View>
      <View style={{ marginTop: 10 }}>
        <DetailTile
          label="Vehicle"
          value={vehicle ? `${vehicle.make} ${vehicle.model}` : "—"}
          sub={vehicle?.plateNumber}
          icon="directions-car"
          fullWidth
        />
      </View>

      {/* Stops */}
      {pickupStops.length > 0 ? (
        <StopChips title="Pickup Stops" stops={pickupStops} icon="flag" />
      ) : null}
      {dropoffStops.length > 0 ? (
        <StopChips title="Dropoff Stops" stops={dropoffStops} icon="outlined-flag" />
      ) : null}

      {/* Fare banner */}
      <View
        style={{
          marginTop: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(34,197,94,0.12)",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(34,197,94,0.4)",
          paddingVertical: 16,
          paddingHorizontal: 16,
        }}
      >
        <View>
          <Text
            style={{
              color: COLORS.accent,
              fontSize: 11,
              fontWeight: "800",
              letterSpacing: 0.9,
            }}
          >
            FARE (FIXED BY ADMIN)
          </Text>
          <Text
            style={{
              color: COLORS.textLight,
              fontSize: 24,
              fontWeight: "900",
              marginTop: 4,
              letterSpacing: -0.3,
            }}
          >
            PKR {FIXED_FARE.toLocaleString()}
          </Text>
        </View>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(34,197,94,0.2)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="verified" size={22} color={COLORS.accent} />
        </View>
      </View>
      <Text
        style={{
          color: COLORS.textMuted,
          fontSize: 11,
          textAlign: "center",
          marginTop: 8,
        }}
      >
        Fare is fixed by admin and cannot be changed.
      </Text>

      {/* Buttons */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
        <Pressable
          onPress={onEdit}
          disabled={submitting}
          style={({ pressed }) => ({
            flex: 1,
            height: 52,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 6,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.2)",
            backgroundColor: "rgba(255,255,255,0.04)",
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Feather name="arrow-left" size={16} color={COLORS.textLight} />
          <Text style={{ color: COLORS.textLight, fontSize: 15, fontWeight: "700" }}>
            Edit
          </Text>
        </Pressable>

        <Pressable
          onPress={onConfirm}
          disabled={submitting}
          style={({ pressed }) => ({
            flex: 1.4,
            borderRadius: 14,
            overflow: "hidden",
            opacity: submitting ? 0.75 : 1,
            transform: [{ scale: pressed && !submitting ? 0.97 : 1 }],
            shadowColor: COLORS.accent,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 6,
          })}
        >
          <LinearGradient
            colors={[COLORS.accent, "#16A34A"]}
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
            {submitting ? (
              <>
                <ActivityIndicator color="white" />
                <Text style={{ color: "white", fontSize: 15, fontWeight: "800" }}>
                  Publishing…
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={{
                    color: "white",
                    fontSize: 15,
                    fontWeight: "800",
                    letterSpacing: 0.3,
                  }}
                >
                  Confirm Ride
                </Text>
                <Feather name="check" size={18} color="white" />
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Reusable subcomponents ────────────────────────────────────────────────

function FieldLabel({ text }: { text: string }) {
  return (
    <Text
      style={{
        color: COLORS.textMuted,
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.5,
        marginTop: 14,
        marginBottom: 6,
      }}
    >
      {text.toUpperCase()}
    </Text>
  );
}

function SelectField({
  icon,
  placeholder,
  value,
  sub,
  onPress,
  error,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  placeholder: string;
  value: string;
  sub?: string;
  onPress?: () => void;
  error?: string;
}) {
  const disabled = !onPress;
  const filled = !!value;
  return (
    <View>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: COLORS.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: error ? "#F87171" : "rgba(255,255,255,0.08)",
          paddingVertical: 12,
          paddingHorizontal: 14,
          opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
        })}
      >
        <MaterialIcons name={icon} size={20} color={COLORS.accent} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: filled ? COLORS.textLight : COLORS.textMuted,
              fontSize: 15,
              fontWeight: filled ? "700" : "500",
            }}
            numberOfLines={1}
          >
            {filled ? value : placeholder}
          </Text>
          {filled && sub ? (
            <Text
              style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}
              numberOfLines={1}
            >
              {sub}
            </Text>
          ) : null}
        </View>
        <Feather name="chevron-down" size={18} color={COLORS.textMuted} />
      </Pressable>
      {error ? <ErrorLine text={error} /> : null}
    </View>
  );
}

function VehicleEmptyState({ onAddVehicle }: { onAddVehicle: () => void }) {
  return (
    <View
      style={{
        marginTop: 8,
        backgroundColor: "rgba(245,158,11,0.10)",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(245,158,11,0.35)",
        paddingVertical: 14,
        paddingHorizontal: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Feather name="alert-triangle" size={14} color="#F59E0B" />
        <Text style={{ color: COLORS.textLight, fontSize: 13, fontWeight: "800" }}>
          No vehicles found
        </Text>
      </View>
      <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 10 }}>
        Please add a vehicle first to create a ride.
      </Text>
      <Pressable
        onPress={onAddVehicle}
        style={({ pressed }) => ({
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: COLORS.accent,
          paddingVertical: 9,
          paddingHorizontal: 14,
          borderRadius: 10,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: "white", fontSize: 13, fontWeight: "800" }}>
          Add Vehicle
        </Text>
        <Feather name="arrow-right" size={14} color="white" />
      </Pressable>
    </View>
  );
}

function VehicleErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View
      style={{
        marginTop: 8,
        backgroundColor: "rgba(239,68,68,0.10)",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(239,68,68,0.35)",
        paddingVertical: 14,
        paddingHorizontal: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Feather name="wifi-off" size={14} color="#F87171" />
        <Text style={{ color: COLORS.textLight, fontSize: 13, fontWeight: "800" }}>
          Could not load vehicles
        </Text>
      </View>
      <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 10 }}>
        {message}
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => ({
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: "rgba(255,255,255,0.08)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.2)",
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 10,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Feather name="refresh-cw" size={12} color={COLORS.textLight} />
        <Text style={{ color: COLORS.textLight, fontSize: 12, fontWeight: "700" }}>
          Retry
        </Text>
      </Pressable>
    </View>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 6,
      }}
    >
      <Feather name="alert-circle" size={12} color="#F87171" />
      <Text style={{ color: "#FCA5A5", fontSize: 12 }}>{text}</Text>
    </View>
  );
}

function StepperBtn({
  icon,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: disabled
          ? "rgba(255,255,255,0.04)"
          : "rgba(34,197,94,0.18)",
        borderWidth: 1,
        borderColor: disabled
          ? "rgba(255,255,255,0.08)"
          : "rgba(34,197,94,0.4)",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <MaterialIcons
        name={icon}
        size={18}
        color={disabled ? COLORS.textMuted : COLORS.accent}
      />
    </Pressable>
  );
}

function StopDot() {
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.accent,
      }}
    />
  );
}

function StopsEditor({
  title,
  icon,
  stops,
  setStops,
  error,
}: {
  title: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  stops: string[];
  setStops: (s: string[]) => void;
  error?: string;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <MaterialIcons name={icon} size={16} color={COLORS.accent} />
          <Text
            style={{
              color: COLORS.textLight,
              fontSize: 13,
              fontWeight: "700",
              letterSpacing: 0.3,
            }}
          >
            {title}
          </Text>
        </View>
        <Pressable
          onPress={() => setStops([...stops, ""])}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: "rgba(34,197,94,0.15)",
            borderWidth: 1,
            borderColor: "rgba(34,197,94,0.35)",
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Feather name="plus" size={12} color={COLORS.accent} />
          <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: "700" }}>
            Add
          </Text>
        </Pressable>
      </View>

      {stops.length === 0 ? (
        <Text
          style={{
            color: COLORS.textMuted,
            fontSize: 12,
            fontStyle: "italic",
            paddingLeft: 2,
          }}
        >
          No stops added
        </Text>
      ) : (
        stops.map((s, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <StopDot />
            <TextInput
              value={s}
              onChangeText={(txt) => {
                const copy = [...stops];
                copy[i] = txt;
                setStops(copy);
              }}
              placeholder={`Stop ${i + 1}`}
              placeholderTextColor={COLORS.textMuted}
              style={{
                flex: 1,
                backgroundColor: COLORS.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                paddingVertical: 10,
                paddingHorizontal: 12,
                color: COLORS.textLight,
                fontSize: 14,
              }}
            />
            <Pressable
              onPress={() => setStops(stops.filter((_, idx) => idx !== i))}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(239,68,68,0.12)",
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.3)",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Feather name="x" size={14} color="#F87171" />
            </Pressable>
          </View>
        ))
      )}

      {error ? <ErrorLine text={error} /> : null}
    </View>
  );
}

function DetailTile({
  label,
  value,
  sub,
  icon,
  fullWidth,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  fullWidth?: boolean;
}) {
  return (
    <View
      style={{
        flex: fullWidth ? undefined : 1,
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        paddingVertical: 12,
        paddingHorizontal: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <MaterialIcons name={icon} size={13} color={COLORS.accent} />
        <Text
          style={{
            color: COLORS.textMuted,
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 0.8,
          }}
        >
          {label.toUpperCase()}
        </Text>
      </View>
      <Text
        style={{ color: COLORS.textLight, fontSize: 14, fontWeight: "700" }}
        numberOfLines={2}
      >
        {value}
      </Text>
      {sub ? (
        <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function StopChips({
  title,
  stops,
  icon,
}: {
  title: string;
  stops: string[];
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
}) {
  return (
    <View
      style={{
        marginTop: 10,
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        paddingVertical: 12,
        paddingHorizontal: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <MaterialIcons name={icon} size={13} color={COLORS.accent} />
        <Text
          style={{
            color: COLORS.textMuted,
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 0.8,
          }}
        >
          {title.toUpperCase()}
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {stops.map((s, i) => (
          <View
            key={i}
            style={{
              backgroundColor: "rgba(34,197,94,0.12)",
              borderWidth: 1,
              borderColor: "rgba(34,197,94,0.3)",
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{ color: COLORS.textLight, fontSize: 12, fontWeight: "600" }}
            >
              {s}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StepDot({
  active,
  filled,
  label,
}: {
  active: boolean;
  filled: boolean;
  label: string;
}) {
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: filled
          ? COLORS.accent
          : active
          ? "rgba(255,255,255,0.15)"
          : "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: filled
          ? COLORS.accent
          : "rgba(255,255,255,0.22)",
      }}
    >
      <Text
        style={{
          color: filled ? "#052e16" : "white",
          fontSize: 12,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Picker sheets ─────────────────────────────────────────────────────────

type Option = { key: string; label: string; sub?: string; disabled?: boolean };

function PickerSheet({
  visible,
  title,
  options,
  selectedKey,
  onSelect,
  onClose,
  emptyText,
}: {
  visible: boolean;
  title: string;
  options: Option[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  emptyText?: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: COLORS.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            paddingBottom: 28,
            paddingHorizontal: 16,
            borderTopWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignSelf: "center",
              marginBottom: 14,
            }}
          />
          <Text
            style={{
              color: COLORS.textLight,
              fontSize: 16,
              fontWeight: "800",
              marginBottom: 12,
            }}
          >
            {title}
          </Text>

          {options.length === 0 ? (
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 13,
                textAlign: "center",
                paddingVertical: 18,
              }}
            >
              {emptyText ?? "No options available"}
            </Text>
          ) : (
            options.map((opt) => {
              const selected = opt.key === selectedKey;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    if (opt.disabled) return;
                    onSelect(opt.key);
                    onClose();
                  }}
                  disabled={opt.disabled}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    marginBottom: 6,
                    backgroundColor: selected
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(255,255,255,0.03)",
                    borderWidth: 1,
                    borderColor: selected
                      ? "rgba(34,197,94,0.4)"
                      : "rgba(255,255,255,0.06)",
                    opacity: opt.disabled ? 0.4 : pressed ? 0.75 : 1,
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: COLORS.textLight,
                        fontSize: 15,
                        fontWeight: "700",
                      }}
                    >
                      {opt.label}
                    </Text>
                    {opt.sub ? (
                      <Text
                        style={{
                          color: COLORS.textMuted,
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {opt.sub}
                      </Text>
                    ) : null}
                  </View>
                  {selected ? (
                    <Feather name="check" size={16} color={COLORS.accent} />
                  ) : null}
                </Pressable>
              );
            })
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── DateTime sheet (dep-free) ─────────────────────────────────────────────

function DateTimeSheet({
  visible,
  initial,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  initial: Date | null;
  onClose: () => void;
  onConfirm: (d: Date) => void;
}) {
  const [draft, setDraft] = useState<Date>(() => initial ?? defaultFuture());

  useEffect(() => {
    if (visible) setDraft(initial ?? defaultFuture());
  }, [visible, initial]);

  const addMinutes = (mins: number) => {
    const d = new Date(draft);
    d.setMinutes(d.getMinutes() + mins);
    setDraft(d);
  };
  const addHours = (h: number) => addMinutes(h * 60);
  const addDays = (d: number) => addMinutes(d * 24 * 60);

  const inPast = draft.getTime() <= Date.now();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: COLORS.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            paddingBottom: 28,
            paddingHorizontal: 16,
            borderTopWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignSelf: "center",
              marginBottom: 14,
            }}
          />
          <Text
            style={{
              color: COLORS.textLight,
              fontSize: 16,
              fontWeight: "800",
              marginBottom: 4,
            }}
          >
            Departure
          </Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 16 }}>
            Use the steppers to pick a future date & time.
          </Text>

          {/* Big display */}
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              paddingVertical: 18,
              paddingHorizontal: 16,
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 11,
                fontWeight: "800",
                letterSpacing: 0.8,
              }}
            >
              DEPARTURE
            </Text>
            <Text
              style={{
                color: COLORS.textLight,
                fontSize: 20,
                fontWeight: "800",
                marginTop: 6,
                letterSpacing: -0.2,
              }}
            >
              {formatDateTime(draft)}
            </Text>
          </View>

          {/* Steppers */}
          <StepRow label="Day" onMinus={() => addDays(-1)} onPlus={() => addDays(1)} />
          <StepRow label="Hour" onMinus={() => addHours(-1)} onPlus={() => addHours(1)} />
          <StepRow label="5 Min" onMinus={() => addMinutes(-5)} onPlus={() => addMinutes(5)} />

          {inPast ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 10,
                backgroundColor: "rgba(239,68,68,0.1)",
                borderColor: "rgba(239,68,68,0.3)",
                borderWidth: 1,
                borderRadius: 10,
                paddingVertical: 8,
                paddingHorizontal: 10,
              }}
            >
              <Feather name="alert-circle" size={12} color="#F87171" />
              <Text style={{ color: "#FCA5A5", fontSize: 12 }}>
                Departure must be in the future.
              </Text>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1,
                height: 48,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.2)",
                backgroundColor: "rgba(255,255,255,0.04)",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: COLORS.textLight, fontSize: 14, fontWeight: "700" }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (inPast) return;
                onConfirm(draft);
                onClose();
              }}
              disabled={inPast}
              style={({ pressed }) => ({
                flex: 1.3,
                height: 48,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: inPast ? "rgba(34,197,94,0.3)" : COLORS.accent,
                opacity: pressed && !inPast ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 14,
                  fontWeight: "800",
                  letterSpacing: 0.3,
                }}
              >
                Confirm
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StepRow({
  label,
  onMinus,
  onPlus,
}: {
  label: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 8,
      }}
    >
      <Text style={{ color: COLORS.textLight, fontSize: 14, fontWeight: "700" }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <StepperBtn icon="remove" onPress={onMinus} />
        <StepperBtn icon="add" onPress={onPlus} />
      </View>
    </View>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDateTime(d: Date): string {
  return d.toLocaleString("en-PK", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function defaultFuture(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}
