import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

type Vehicle = {
  id: string;
  make: string;
  model: string;
  plateNumber: string;
  seats: number;
  isDefault: boolean;
};

type FormState = {
  make: string;
  model: string;
  plateNumber: string;
  seats: string;
};

const EMPTY_FORM: FormState = { make: "", model: "", plateNumber: "", seats: "" };

export default function Vehicles() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/Vehicle/my");
      setVehicles(res.data);
    } catch {
      alert("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  const addVehicle = async () => {
    if (!form.make.trim() || !form.model.trim() || !form.plateNumber.trim() || !form.seats) {
      alert("All fields are required");
      return;
    }
    const seats = Number(form.seats);
    if (seats < 1 || seats > 20) {
      alert("Seats must be between 1 and 20");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/Vehicle", {
        make: form.make.trim(),
        model: form.model.trim(),
        plateNumber: form.plateNumber.trim(),
        seats,
      });
      setVehicles((prev) => [...prev, res.data]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch {
      alert("Failed to add vehicle");
    } finally {
      setSaving(false);
    }
  };

  const deleteVehicle = async (id: string) => {
    if (!confirm("Delete this vehicle?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/Vehicle/${id}`);
      setVehicles((prev) => {
        const updated = prev.filter((v) => v.id !== id);
        const wasDefault = prev.find((v) => v.id === id)?.isDefault;
        if (wasDefault && updated.length > 0) {
          updated[0] = { ...updated[0], isDefault: true };
        }
        return updated;
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? "Failed to delete vehicle");
    } finally {
      setDeletingId(null);
    }
  };

  const setDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      await api.patch(`/Vehicle/${id}/default`);
      setVehicles((prev) => prev.map((v) => ({ ...v, isDefault: v.id === id })));
    } catch {
      alert("Failed to set default vehicle");
    } finally {
      setSettingDefaultId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Vehicles</h1>
            <p className="text-sm text-gray-500 mt-1">Manage the vehicles used for rides</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/driver")}
              className="text-sm text-gray-600 hover:text-gray-800 border border-gray-300 px-3 py-2 rounded-lg"
            >
              ← Dashboard
            </button>
            <button
              onClick={() => setShowForm((f) => !f)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {showForm ? "Cancel" : "+ Add Vehicle"}
            </button>
          </div>
        </div>

        {/* Add Vehicle Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border border-blue-100">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Add New Vehicle</h2>
            <div className="space-y-3">
              <input
                placeholder="Make (e.g. Honda)"
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                placeholder="Model (e.g. Civic)"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                placeholder="Plate Number (e.g. ABC-123)"
                value={form.plateNumber}
                onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="number"
                placeholder="Seats (1–20)"
                value={form.seats}
                min={1}
                max={20}
                onChange={(e) => setForm({ ...form, seats: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={addVehicle}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {saving ? "Adding..." : "Add Vehicle"}
              </button>
            </div>
          </div>
        )}

        {/* Vehicle List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow">
            <p className="text-4xl mb-3">🚗</p>
            <p className="text-gray-500 font-medium">No vehicles yet</p>
            <p className="text-sm text-gray-400 mt-1">Add your first vehicle to start creating rides</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className={`bg-white rounded-2xl shadow p-5 flex items-center justify-between gap-4 border-l-4 transition-all ${
                  v.isDefault ? "border-blue-500" : "border-transparent"
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-3xl">🚙</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800 text-base">
                        {v.make} {v.model}
                      </span>
                      {v.isDefault && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                      <span>🪪 {v.plateNumber}</span>
                      <span>💺 {v.seats} seats</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  {!v.isDefault && (
                    <button
                      onClick={() => setDefault(v.id)}
                      disabled={settingDefaultId === v.id}
                      className="text-xs font-medium bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors disabled:opacity-50"
                    >
                      {settingDefaultId === v.id ? "..." : "Set Default"}
                    </button>
                  )}
                  <button
                    onClick={() => deleteVehicle(v.id)}
                    disabled={deletingId === v.id}
                    className="text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg border border-red-200 transition-colors disabled:opacity-50"
                  >
                    {deletingId === v.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
