export interface RideStop {
  stopName: string;
  stopType: string;
}

export interface Ride {
  id: string;
  driverId: string;
  fromAddress: string;
  toAddress: string;
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
  status: string;
  driverName: string;
  driverPhone: string;
  vehicleMake: string;
  vehicleModel: string;
  stops: RideStop[];
  pickupStops: string[];
  dropoffStops: string[];
  hasRequested: boolean;
  bookingStatus: string | null;
}

export interface CreateRideRequest {
  vehicleId: string;
  fromAddress: string;
  toAddress: string;
  departureTime: string;
  availableSeats: number;
  pickupStops?: string[];
  dropoffStops?: string[];
}
