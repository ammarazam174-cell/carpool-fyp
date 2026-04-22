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
import type { Booking, CreateBookingRequest } from "@/types/booking";

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/auth/login", body);
  return data;
}

export async function register(body: RegisterRequest): Promise<void> {
  await api.post("/api/auth/register", body);
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

export async function createBooking(
  body: CreateBookingRequest
): Promise<Booking> {
  const { data } = await api.post<Booking>("/api/bookings", body);
  return data;
}

export async function myBookings(): Promise<Booking[]> {
  const { data } = await api.get<Booking[]>("/api/bookings/my");
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

export type VehicleDto = {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  plateNumber: string;
  seats: number;
  isDefault: boolean;
  createdAt: string;
};

export type CreateVehicleRequest = {
  make: string;
  model: string;
  plateNumber: string;
  seats: number;
};

export async function listMyVehicles(): Promise<VehicleDto[]> {
  const { data } = await api.get<VehicleDto[]>("/api/Vehicle/my");
  return data;
}

export async function createVehicle(
  body: CreateVehicleRequest
): Promise<VehicleDto> {
  const { data } = await api.post<VehicleDto>("/api/Vehicle", body);
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
