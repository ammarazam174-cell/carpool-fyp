export interface CreateBookingRequest {
  rideId: string;
  seats: number;
  pickupStop: string;
  dropoffStop: string;
  passengerLatitude?: number;
  passengerLongitude?: number;
  passengerAddress?: string;
}

export interface Booking {
  id: string;
  rideId: string;
  passengerId: number;
  seats: number;
  status: string;
  pickupStop: string;
  dropoffStop: string;
  createdAt: string;
}
