import { useEffect, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const BASE = "http://localhost:5000";

type Driver = {
  id: string;
  fullName: string;
  phoneNumber: string;
  cnic: string | null;
  profileImageUrl: string | null;
  cnicImageUrl: string | null;   // matches C# CnicImageUrl → JSON cnicImageUrl
  licenseImageUrl: string | null;
  driverStatus: "Pending" | "Approved" | "Rejected";
};

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    Approved: "bg-green-900 text-green-300",
    Rejected:  "bg-red-900 text-red-300",
    Pending:   "bg-yellow-900 text-yellow-300",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${classes[status] ?? "bg-gray-700 text-gray-400"}`}>
      {status}
    </span>
  );
}

// ─── Image Modal ─────────────────────────────────────────────────────────────
function ImageModal({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <span className="text-white font-semibold">{label}</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="p-4 flex items-center justify-center bg-gray-800 min-h-48">
          <img
            src={url}
            alt={label}
            className="max-w-full max-h-[70vh] rounded-lg object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "";
              (e.target as HTMLImageElement).alt = "Image not available";
            }}
          />
        </div>
        <div className="px-5 py-3 border-t border-gray-700 text-right">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm underline mr-4"
          >
            Open in new tab
          </a>
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-lg text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Doc button ───────────────────────────────────────────────────────────────
function DocButton({ url, label, onClick }: { url: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-gray-600"
    >
      <span>🪪</span> {label}
    </button>
  );
}

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [modal, setModal] = useState<{ url: string; label: string } | null>(null);

  const load = () => {
    setLoading(true);
    api.get("/admin/drivers")
      .then((res) => setDrivers(res.data))
      .catch(() => toast.error("Failed to load drivers"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    setProcessing(id);
    try {
      await api.put(`/admin/approve-driver/${id}`);
      toast.success("Driver approved");
      setDrivers((prev) => prev.map((d) => d.id === id ? { ...d, driverStatus: "Approved" } : d));
    } catch {
      toast.error("Failed to approve driver");
    } finally { setProcessing(null); }
  };

  const reject = async (id: string) => {
    setProcessing(id);
    try {
      await api.put(`/admin/reject-driver/${id}`);
      toast.success("Driver rejected");
      setDrivers((prev) => prev.map((d) => d.id === id ? { ...d, driverStatus: "Rejected" } : d));
    } catch {
      toast.error("Failed to reject driver");
    } finally { setProcessing(null); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Driver Management</h2>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 h-16 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No drivers found.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-700">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-gray-800 text-gray-400 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Driver</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">CNIC #</th>
                <th className="px-4 py-3 text-left">Documents</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="border-t border-gray-700 hover:bg-gray-800/50 transition-colors">

                  {/* Avatar + Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {d.profileImageUrl ? (
                        <img
                          src={`${BASE}${d.profileImageUrl}`}
                          alt="profile"
                          className="w-9 h-9 rounded-full object-cover border border-gray-600 shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm font-bold shrink-0">
                          {d.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-white">{d.fullName}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3">{d.phoneNumber}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{d.cnic ?? "—"}</td>

                  {/* Document buttons */}
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {d.cnicImageUrl ? (
                        <DocButton
                          url={`${BASE}${d.cnicImageUrl}`}
                          label="View CNIC"
                          onClick={() => setModal({ url: `${BASE}${d.cnicImageUrl!}`, label: `${d.fullName} — CNIC` })}
                        />
                      ) : (
                        <span className="text-xs text-gray-600 italic">No CNIC</span>
                      )}
                      {d.licenseImageUrl && (
                        <DocButton
                          url={`${BASE}${d.licenseImageUrl}`}
                          label="View License"
                          onClick={() => setModal({ url: `${BASE}${d.licenseImageUrl!}`, label: `${d.fullName} — License` })}
                        />
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={d.driverStatus} />
                  </td>

                  {/* Approve / Reject */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {d.driverStatus !== "Approved" && (
                        <button
                          onClick={() => approve(d.id)}
                          disabled={processing === d.id}
                          className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                        >
                          Approve ✅
                        </button>
                      )}
                      {d.driverStatus !== "Rejected" && (
                        <button
                          onClick={() => reject(d.id)}
                          disabled={processing === d.id}
                          className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                        >
                          Reject ❌
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Image modal */}
      {modal && <ImageModal url={modal.url} label={modal.label} onClose={() => setModal(null)} />}
    </div>
  );
}
