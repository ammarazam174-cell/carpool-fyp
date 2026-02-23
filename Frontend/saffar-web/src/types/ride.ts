export interface RideStop {
  stopName: string;
  stopType: string;
}

export interface Ride {
  id: string;
  fromAddress: string;
  toAddress: string;
  departureTime: string;
  availableSeats: number;
  price: number;
  status: string;

  driverName: string;
  driverPhone: string;

  vehicleMake: string;
  vehicleModel: string;

  pickupStops: string[];
  dropoffStops: string[];
  
  stops: RideStop[];
}