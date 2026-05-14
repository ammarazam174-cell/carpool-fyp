import { api } from "./axios";
import type {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ResetPasswordRequest,
} from "@/types/auth";
import type { Ride, CreateRideRequest } from "@/types/ride";
import type { CreateBookingRequest } from "@/types/booking";
import type {
  WalletBalance,
  Transaction,
  TopUpResult,
} from "@/types/wallet";

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/auth/login", body);
  return data;
}

export async function register(body: RegisterRequest): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>("/api/auth/register", body);
  return data;
}

export interface RegisterResponse {
  message: string;
  email: string;
  devOtp?: string;
}

export type OtpPurpose = "SignupEmail" | "EmailChange" | "PasswordReset";

// Signup OTP — uses the auth-controller alias so all auth flows route
// through one path. Email-change still goes through /api/otp/* because
// it needs the authenticated user side-effect.
export async function sendOtp(
  email: string,
  purpose: OtpPurpose = "SignupEmail",
  newEmail?: string
): Promise<{ message: string; devOtp?: string }> {
  if (purpose === "SignupEmail") {
    const { data } = await api.post("/api/auth/send-otp", { email });
    return data;
  }
  const { data } = await api.post("/api/otp/send", { email, purpose, newEmail });
  return data;
}

export async function verifyOtp(
  email: string,
  code: string,
  purpose: OtpPurpose = "SignupEmail"
): Promise<{ message: string }> {
  if (purpose === "SignupEmail") {
    const { data } = await api.post("/api/auth/verify-otp", { email, otp: code });
    return data;
  }
  const { data } = await api.post("/api/otp/verify", { email, code, purpose });
  return data;
}

export async function forgotPassword(
  body: ForgotPasswordRequest
): Promise<ForgotPasswordResponse> {
  const { data } = await api.post<ForgotPasswordResponse>(
    "/api/auth/forgot-password",
    body
  );
  return data;
}

export async function resetPassword(body: ResetPasswordRequest): Promise<void> {
  await api.post("/api/auth/reset-password", body);
}

export async function listRides(): Promise<Ride[]> {
  const { data } = await api.get<Ride[]>("/api/rides");
  return data;
}

export async function createRide(body: CreateRideRequest): Promise<Ride> {
  const { data } = await api.post<Ride>("/api/rides", body);
  return data;
}

export type CreateBookingResponse = {
  message: string;
  bookingId: string;
  pickupStop: string;
  dropoffStop: string;
  passengerAddress: string | null;
  passengerLatitude: number | null;
  passengerLongitude: number | null;
};

export async function createBooking(
  body: CreateBookingRequest
): Promise<CreateBookingResponse> {
  const { data } = await api.post<CreateBookingResponse>(
    "/api/bookings",
    body
  );
  return data;
}

export type PassengerBookingStatus =
  | "Pending"
  | "Accepted"
  | "Rejected"
  | "Cancelled"
  | "Completed";

export type PassengerBookingDto = {
  id: string;
  rideId: string;
  status: PassengerBookingStatus;
  seatsBooked: number;
  totalPrice: number;
  pickupStop: string;
  dropoffStop: string;
  passengerAddress: string | null;
  passengerLatitude: number | null;
  passengerLongitude: number | null;
  createdAt: string;
  ride: {
    fromAddress: string;
    toAddress: string;
    departureTime: string;
    price: number;
    status: string;
    pickupLocation: string | null;
  };
  driver: {
    fullName: string;
    phoneNumber: string | null;
  };
};

export async function listMyPassengerBookings(): Promise<PassengerBookingDto[]> {
  const { data } = await api.get<PassengerBookingDto[]>("/api/bookings/my");
  return data;
}

export type DriverDailyPoint = { date: string; earnings: number };

export type DriverRecentRide = {
  fromAddress: string;
  toAddress: string;
  departureTime: string;
  earnings: number;
  passengers: number;
};

export type DriverAnalytics = {
  totalEarnings: number;
  totalRides: number;
  thisMonthEarnings: number;
  todayEarnings: number;
  dailyData: DriverDailyPoint[];
  recentRides: DriverRecentRide[];
};

export async function getDriverAnalytics(): Promise<DriverAnalytics> {
  const { data } = await api.get<DriverAnalytics>("/api/users/driver-analytics");
  return data;
}

export type MyProfile = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  cnic: string | null;
  dateOfBirth: string | null;
  age: number | null;
  gender: string | null;
  rating: number | null;
  role: "Admin" | "Driver" | "Passenger";
  isProfileComplete: boolean;
  isVerified: boolean;
  status: "Pending" | "Approved" | "Rejected" | null;
  profileImageUrl: string | null;
  cnicImageUrl: string | null;
  licenseImageUrl: string | null;
};

export async function getMyProfile(): Promise<MyProfile> {
  const { data } = await api.get<MyProfile>("/api/profile/me");
  return data;
}

export async function uploadProfileDocuments(form: FormData): Promise<void> {
  await api.post("/api/profile/upload-documents", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export type UpdateProfilePayload = {
  fullName?: string;
  gender?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string; // YYYY-MM-DD
};

// ── Email change with OTP ────────────────────────────────────────────────────
// The backend's /api/otp/send + /api/otp/verify endpoints handle EmailChange
// purpose: send hashes the OTP, mails it to the NEW address, enforces 10-min
// expiry, max 5 attempts, and a per-email cooldown (returned as 429 with
// retryAfterSeconds). Verify atomically swaps the user's email on success.

export async function requestEmailChangeOtp(newEmail: string): Promise<void> {
  await api.post("/api/otp/send", {
    email: newEmail,
    purpose: "EmailChange",
    newEmail,
  });
}

export async function verifyEmailChangeOtp(newEmail: string, code: string): Promise<void> {
  await api.post("/api/otp/verify", {
    email: newEmail,
    code,
    purpose: "EmailChange",
  });
}

export async function updateMyProfile(p: UpdateProfilePayload): Promise<void> {
  // Backend uses [FromForm], so send as multipart with PascalCase keys.
  const form = new FormData();
  if (p.fullName !== undefined)    form.append("FullName",    p.fullName);
  if (p.gender !== undefined)      form.append("Gender",      p.gender);
  if (p.email !== undefined)       form.append("Email",       p.email);
  if (p.phoneNumber !== undefined) form.append("PhoneNumber", p.phoneNumber);
  if (p.dateOfBirth !== undefined) form.append("DateOfBirth", p.dateOfBirth);
  await api.put("/api/profile/update", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export type VehicleDto = {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  plateNumber: string;
  seats: number;
  isDefault: boolean;
  createdAt: string;
  registrationDocUrl: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  rejectionReason: string | null;
};

export type CreateVehicleRequest = {
  make: string;
  model: string;
  plateNumber: string;
  seats: number;
  registrationDoc?: {
    uri: string;
    name: string;
    mimeType: string;
  };
};

export async function listMyVehicles(): Promise<VehicleDto[]> {
  const { data } = await api.get<VehicleDto[]>("/api/Vehicle/my");
  return data;
}

export async function createVehicle(
  body: CreateVehicleRequest
): Promise<VehicleDto> {
  // Always send multipart so the backend receives the same shape whether
  // there's a registration doc attached or not.
  const form = new FormData();
  form.append("Make", body.make);
  form.append("Model", body.model);
  form.append("PlateNumber", body.plateNumber);
  form.append("Seats", String(body.seats));
  if (body.registrationDoc) {
    // RN's FormData file shape: { uri, name, type } cast through `any` because
    // TS doesn't know RN's lax FormData typings.
    form.append("RegistrationDoc", {
      uri: body.registrationDoc.uri,
      name: body.registrationDoc.name,
      type: body.registrationDoc.mimeType,
    } as any);
  }
  const { data } = await api.post<VehicleDto>("/api/Vehicle", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteVehicle(id: string): Promise<void> {
  await api.delete(`/api/Vehicle/${id}`);
}

export type MyRidePassenger = {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  seatsBooked: number;
  pickupStop: string | null;
  passengerAddress: string | null;
  totalPrice: number;
};

export type MyDriverRide = {
  id: string;
  fromAddress: string;
  toAddress: string;
  pickupLocation: string | null;
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
  status: string;
  driverLat: number | null;
  driverLng: number | null;
  driverLocationUpdatedAt: string | null;
  acceptedCount: number;
  passengers: MyRidePassenger[];
};

export async function listMyDriverRides(): Promise<MyDriverRide[]> {
  const { data } = await api.get<MyDriverRide[]>("/api/Rides/my");
  return data;
}

export async function startRide(rideId: string): Promise<void> {
  await api.put(`/api/Rides/${rideId}/start`);
}

export async function completeRide(rideId: string): Promise<void> {
  await api.put(`/api/Rides/${rideId}/complete`);
}

export type DriverLocationUpdate = {
  lat: number;
  lng: number;
};

export async function sendDriverLocation(
  rideId: string,
  loc: DriverLocationUpdate
): Promise<void> {
  await api.put(`/api/Rides/${rideId}/location`, loc);
}

export type DriverLocationSnapshot = {
  status: string;
  driverLat: number | null;
  driverLng: number | null;
  driverLocationUpdatedAt: string | null;
  pickupLocation: string | null;
};

export async function getDriverLocation(
  rideId: string
): Promise<DriverLocationSnapshot> {
  const { data } = await api.get<DriverLocationSnapshot>(
    `/api/Rides/${rideId}/location`
  );
  return data;
}

export type DriverBookingStatus =
  | "Pending"
  | "Accepted"
  | "Rejected"
  | "Cancelled"
  | "Completed";

export type DriverBookingDto = {
  id: string;
  rideId: string;
  status: DriverBookingStatus;
  seatsBooked: number;
  pickupStop: string;
  dropoffStop: string;
  passengerAddress: string | null;
  passengerLatitude: number | null;
  passengerLongitude: number | null;
  createdAt: string;
  rideAvailableSeats: number;
  rideTotalSeats: number;
  pricePerSeat: number;
  totalPrice: number;
  ride: {
    fromAddress: string;
    toAddress: string;
    departureTime: string;
    price: number;
  };
  passenger: {
    fullName: string;
    phoneNumber: string | null;
  };
};

export async function listDriverBookings(): Promise<DriverBookingDto[]> {
  const { data } = await api.get<DriverBookingDto[]>("/api/Bookings/driver/my");
  return data;
}

export async function acceptDriverBooking(id: string): Promise<void> {
  await api.put(`/api/Bookings/${id}/accept`);
}

export async function rejectDriverBooking(id: string): Promise<void> {
  await api.put(`/api/Bookings/${id}/reject`);
}

// ── Wallet ────────────────────────────────────────────────────────────────────

export async function getWalletBalance(): Promise<WalletBalance> {
  const { data } = await api.get<WalletBalance>("/api/wallet/balance");
  return data;
}

export async function topUpWallet(
  amount: number,
  idempotencyKey?: string
): Promise<TopUpResult> {
  // Pass the key in *both* the body (preferred) and the Idempotency-Key
  // header (Stripe convention) so either side of the wire can deduplicate.
  const { data } = await api.post<TopUpResult>(
    "/api/wallet/topup",
    { amount, idempotencyKey },
    idempotencyKey
      ? { headers: { "Idempotency-Key": idempotencyKey } }
      : undefined
  );
  return data;
}

export async function listWalletTransactions(limit = 50): Promise<Transaction[]> {
  const { data } = await api.get<Transaction[]>(
    `/api/wallet/transactions?limit=${limit}`
  );
  return data;
}
