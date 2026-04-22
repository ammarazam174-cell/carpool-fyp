import { useEffect, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const BASE = "http://localhost:5000";

type User = {
  id: string;
  fullName: string | null;
  role: string;
  phoneNumber: string;
  createdAt: string;
  profileImageUrl: string | null;
  cnicImageUrl: string | null;
  licenseImageUrl: string | null;
  driverStatus: string;
  isVerified: boolean;
  isProfileComplete: boolean;
};

type RoleFilter = "All" | "Driver" | "Passenger";

function RoleBadge({ role }: { role: string }) {
  const classes: Record<string, string> = {
    Driver:    "bg-blue-900 text-blue-300",
    Passenger: "bg-purple-900 text-purple-300",
    Admin:     "bg-gray-700 text-gray-300",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${classes[role] ?? "bg-gray-700 text-gray-400"}`}>
      {role}
    </span>
  );
}

function StatusBadge({ status, isProfileComplete }: { status: string; isProfileComplete: boolean }) {
  if (!isProfileComplete) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-800 text-gray-500">
        No Docs
      </span>
    );
  }
  const classes: Record<string, string> = {
    Approved: "bg-green-900 text-green-300",
    Pending:  "bg-amber-900 text-amber-300",
    Rejected: "bg-red-900 text-red-300",
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
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-4 flex items-center justify-center bg-gray-800 min-h-48">
          <img
            src={url}
            alt={label}
            className="max-w-full max-h-[70vh] rounded-lg object-contain"
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

function DocButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-gray-600"
    >
      <span>🪪</span> {label}
    </button>
  );
}

export default function Users() {
  const [users, setUsers]   = useState<User[]>([]);
  const [filter, setFilter] = useState<RoleFilter>("All");
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState<{ url: string; label: string } | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = filter !== "All" ? { role: filter } : {};
    api.get("/admin/users", { params })
      .then((res) => setUsers(res.data))
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, [filter]);

  const updateStatus = (id: string, newStatus: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, driverStatus: newStatus, isVerified: newStatus === "Approved" }
          : u
      )
    );
  };

  const approve = async (id: string) => {
    setActionId(id);
    try {
      await api.put(`/admin/approve-user/${id}`);
      updateStatus(id, "Approved");
      toast.success("User approved");
    } catch {
      toast.error("Failed to approve user");
    } finally {
      setActionId(null);
    }
  };

  const reject = async (id: string) => {
    setActionId(id);
    try {
      await api.put(`/admin/reject-user/${id}`);
      updateStatus(id, "Rejected");
      toast.success("User rejected");
    } catch {
      toast.error("Failed to reject user");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-white">User Management</h2>
        <div className="flex gap-2">
          {(["All", "Driver", "Passenger"] as RoleFilter[]).map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === r
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 h-16 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No users found for this filter.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-700">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-gray-800 text-gray-400 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Documents</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const docs: { url: string; label: string }[] = [];
                if (u.cnicImageUrl)    docs.push({ url: `${BASE}${u.cnicImageUrl}`,    label: "CNIC" });
                if (u.licenseImageUrl) docs.push({ url: `${BASE}${u.licenseImageUrl}`, label: "License" });

                const busy = actionId === u.id;
                const canAct = u.isProfileComplete && u.role !== "Admin";

                return (
                  <tr key={u.id} className="border-t border-gray-700 hover:bg-gray-800/50 transition-colors">

                    {/* Avatar + name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.profileImageUrl ? (
                          <img
                            src={`${BASE}${u.profileImageUrl}`}
                            alt="profile"
                            className="w-9 h-9 rounded-full object-cover border border-gray-600 shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm font-bold shrink-0">
                            {(u.fullName ?? "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-white">{u.fullName ?? "—"}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3">{u.phoneNumber}</td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={u.driverStatus} isProfileComplete={u.isProfileComplete} />
                    </td>

                    {/* Documents */}
                    <td className="px-4 py-3">
                      {docs.length > 0 ? (
                        <div className="flex gap-2 flex-wrap">
                          {docs.map((doc) => (
                            <DocButton
                              key={doc.label}
                              label={`View ${doc.label}`}
                              onClick={() => setModal({ url: doc.url, label: `${u.fullName ?? "User"} — ${doc.label}` })}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600 italic">No documents</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {!canAct ? (
                        <span className="text-xs text-gray-600 italic">—</span>
                      ) : (
                        <div className="flex gap-2">
                          {u.driverStatus !== "Approved" && (
                            <button
                              onClick={() => approve(u.id)}
                              disabled={busy}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-700 hover:bg-green-600 text-white disabled:opacity-50 transition-colors"
                            >
                              {busy ? "…" : "✓ Approve"}
                            </button>
                          )}
                          {u.driverStatus !== "Rejected" && (
                            <button
                              onClick={() => reject(u.id)}
                              disabled={busy}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-700 hover:bg-red-600 text-white disabled:opacity-50 transition-colors"
                            >
                              {busy ? "…" : "✕ Reject"}
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && <ImageModal url={modal.url} label={modal.label} onClose={() => setModal(null)} />}
    </div>
  );
}
