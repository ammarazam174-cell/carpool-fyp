import { Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import ProtectedRoute from "./ProtectedRoute";

import DriverDashboard from "../pages/driver/DriverDashboard";
import CreateRide from "../pages/driver/CreateRide";
import DriverBookings from "../pages/driver/DriverBookings";
import DriverMyRides from "../pages/driver/DriverMyRides";
import AddVehicle from "../pages/driver/AddVehicle";

import PassengerDashboard from "../pages/passenger/PassengerDashboard";
import PassengerMyBookings from "../pages/passenger/PassengerMyBookings";
import RideDetails from "../pages/passenger/RideDetails";

import DriverProfile from "../pages/driver/DriverProfile";

export default function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Login />} />

      {/* DRIVER */}
      <Route
        path="/driver"
        element={
          <ProtectedRoute role="Driver">
            <DriverDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/driver/add-vehicle"
        element={
          <ProtectedRoute role="Driver">
            <AddVehicle />
          </ProtectedRoute>
        }
      />

      <Route
        path="/driver/profile"
        element={
          <ProtectedRoute role="Driver">
            <DriverProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/driver/create-ride"
        element={
          <ProtectedRoute role="Driver">
            <CreateRide />
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver/bookings"
        element={
          <ProtectedRoute role="Driver">
            <DriverBookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver/my-rides"
        element={
          <ProtectedRoute role="Driver">
            <DriverMyRides />
          </ProtectedRoute>
        }
      />

      {/* PASSENGER */}
      <Route
        path="/passenger"
        element={
          <ProtectedRoute role="Passenger">
            <PassengerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/passenger/bookings"
        element={
          <ProtectedRoute role="Passenger">
            <PassengerMyBookings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/passenger/rides/:id"
        element={
          <ProtectedRoute role="Passenger">
            <RideDetails />
          </ProtectedRoute>
        }
      />
      {/* FALLBACK */}
      <Route path="/unauthorized" element={<h2>Unauthorized</h2>} />
    </Routes>

  );
}