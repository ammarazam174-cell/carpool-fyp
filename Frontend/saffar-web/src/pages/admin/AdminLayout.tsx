import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const navLinks = [
  { to: "/admin",          label: "Dashboard", end: true  },
  { to: "/admin/drivers",  label: "Drivers",   end: false },
  { to: "/admin/vehicles", label: "Vehicles",  end: false },
  { to: "/admin/rides",    label: "Rides",     end: false },
  { to: "/admin/users",    label: "Users",     end: false },
  { to: "/admin/bookings", label: "Bookings",  end: false },
];

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-60 bg-gray-800 flex flex-col shrink-0 border-r border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-lg font-bold text-white tracking-wide">Saffar Admin</h1>
          <p className="text-xs text-gray-400 mt-1">Management Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* MAIN AREA */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* TOPBAR */}
        <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 shrink-0">
          <span className="text-gray-400 text-sm">Admin Dashboard</span>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-white">Admin</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-900">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
