export interface LoginResponse {
    token: string;
    id: string;
    fullName: string;
    role: "Driver" | "Passenger";
    isProfileComplete: boolean;
}