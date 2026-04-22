export type Role = "Admin" | "Driver" | "Passenger";

export type DriverStatus = "Pending" | "Approved" | "Rejected" | null;

export interface SessionUser {
  id: number;
  fullName: string;
  role: Role;
  isProfileComplete: boolean;
  isVerified: boolean;
  status: DriverStatus;
  hasVehicle: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  id: number;
  fullName: string;
  role: Role;
  isProfileComplete: boolean;
  isVerified: boolean;
  status: DriverStatus;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: Exclude<Role, "Admin">;
  cnic?: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  devOtp?: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}
