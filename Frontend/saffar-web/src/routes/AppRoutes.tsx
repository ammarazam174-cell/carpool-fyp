import { Routes, Route } from "react-router-dom";

// Public Pages
import Signup from "../pages/Signup";
import Login from "../pages/Login";
import CompleteProfile from "../pages/CompleteProfile";

// Protected Route Wrapper
import ProtectedRoute from "./ProtectedRoute";

// Admin
import AdminLayout    from "../pages/admin/AdminLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";
import Drivers        from "../pages/admin/Drivers";
import Rides          from "../pages/admin/Rides";
import Users          from "../pages/admin/Users";
import Bookings       from "../pages/admin/Bookings";
import AdminVehicles  from "../pages/admin/Vehicles";

// Driver Pages
import DriverDashboard from "../pages/driver/DriverDashboard";
import CreateRide from "../pages/driver/CreateRide";
import DriverBookings from "../pages/driver/DriverBookings";
import DriverMyRides from "../pages/driver/DriverMyRides";
import AddVehicle from "../pages/driver/AddVehicle";
import Vehicles from "../pages/driver/Vehicles";
import DriverProfile from "../pages/driver/DriverProfile";

// Passenger Pages
import PassengerViewProfile from "../pages/passenger/PassengerViewProfile";
import PassengerDashboard from "../pages/passenger/PassengerDashboard";
import PassengerMyBookings from "../pages/passenger/PassengerMyBookings";
import RideDetails from "../pages/passenger/RideDetails";

// Wallet (shared by Driver + Passenger; mounted under both role-prefixes)
import Wallet from "../pages/wallet/Wallet";
import TopUp from "../pages/wallet/TopUp";

export default function AppRoutes() {
  return (
    <Routes>
      
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />

      {/* DRIVER ROUTES */}
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
        path="/driver/vehicles"
        element={
          <ProtectedRoute role="Driver">
            <Vehicles />
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
      <Route
        path="/driver/wallet"
        element={
          <ProtectedRoute role="Driver">
            <Wallet backTo="/driver" topUpTo="/driver/wallet/topup" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver/wallet/topup"
        element={
          <ProtectedRoute role="Driver">
            <TopUp backTo="/driver/wallet" walletPath="/driver/wallet" />
          </ProtectedRoute>
        }
      />

      {/* PASSENGER ROUTES */}
      <Route
        path="/passenger"
        element={
          <ProtectedRoute role="Passenger">
            <PassengerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/passenger/my-profile"
        element={
          <ProtectedRoute role="Passenger">
            <PassengerViewProfile />
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
      <Route
        path="/passenger/wallet"
        element={
          <ProtectedRoute role="Passenger">
            <Wallet backTo="/passenger" topUpTo="/passenger/wallet/topup" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/passenger/wallet/topup"
        element={
          <ProtectedRoute role="Passenger">
            <TopUp backTo="/passenger/wallet" walletPath="/passenger/wallet" />
          </ProtectedRoute>
        }
      />

      {/* ADMIN ROUTES — nested, all protected by AdminLayout wrapper */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="Admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="drivers"  element={<Drivers />}  />
        <Route path="vehicles" element={<AdminVehicles />} />
        <Route path="rides"    element={<Rides />}    />
        <Route path="users"    element={<Users />}    />
        <Route path="bookings" element={<Bookings />} />
      </Route>

      {/* FALLBACK */}
      <Route path="/unauthorized" element={<h2>Unauthorized</h2>} />

    </Routes>
  );
}