import { useEffect, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const BASE = "http://localhost:5000";

type VerificationStatus = "Pending" | "Approved" | "Rejected";

type AdminVehicle = {
  id: string;
  ownerId: string;
  ownerName: string | null;
  ownerPhone: string | null;
  make: string;
  model: string;
  plateNumber: string;
  seats: number;
  isDefault: boolean;
  registrationDocUrl: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  verificationStatus: VerificationStatus;
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  const classes: Record<VerificationStatus, string> = {
    Approved: "bg-green-900 text-green-300",
    Rejected: "bg-red-900 text-red-300",
    Pending: "bg-yellow-900 text-yellow-300",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${classes[status]}`}>
      {status}
    </span>
  );
}

function DocModal({
  url,
  label,
  onClose,
}: {
  url: string;
  label: string;
  onClose: () => void;
}) {
  const isPdf = url.toLowerCase().endsWith(".pdf");
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full"
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
        <div className="p-4 flex items-center justify-center bg-gray-800 min-h-[24rem]">
          {isPdf ? (
            <iframe
              src={url}
              title={label}
              className="w-full h-[70vh] rounded-lg bg-white"
            />
          ) : (
            <img
              src={url}
              alt={label}
              className="max-w-full max-h-[70vh] rounded-lg object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).alt = "Image not available";
              }}
            />
          )}
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

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<VerificationStatus | "All">("All");
  const [modal, setModal] = useState<{ url: string; label: string } | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get<AdminVehicle[]>("/admin/vehicles")
      .then((res) => setVehicles(res.data))
      .catch(() => toast.error("Failed to load vehicles"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    setProcessing(id);
    try {
      await api.put(`/admin/vehicles/${id}/approve`);
      toast.success("Vehicle approved");
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === id
            ? {
                ...v,
                isVerified: true,
                verifiedAt: new Date().toISOString(),
                rejectionReason: null,
                verificationStatus: "Approved",
              }
            : v
        )
      );
    } catch {
      toast.error("Failed to approve vehicle");
    } finally {
      setProcessing(null);
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt(
      "Reason for rejection (shown to the driver, optional):",
      ""
    );
    if (reason === null) return;
    setProcessing(id);
    try {
      await api.put(`/admin/vehicles/${id}/reject`, { reason });
      toast.success("Vehicle rejected");
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === id
            ? {
                ...v,
                isVerified: false,
                verifiedAt: null,
                rejectionReason: reason.trim() || "Rejected by admin",
                verificationStatus: "Rejected",
              }
            : v
        )
      );
    } catch {
      toast.error("Failed to reject vehicle");
    } finally {
      setProcessing(null);
    }
  };

  const filtered =
    filter === "All" ? vehicles : vehicles.filter((v) => v.verificationStatus === filter);

  const counts = vehicles.reduce(
    (acc, v) => {
      acc[v.verificationStatus]++;
      return acc;
    },
    { Pending: 0, Approved: 0, Rejected: 0 } as Record<VerificationStatus, number>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Vehicle Verification</h2>
        <div className="flex gap-2">
          {(["All", "Pending", "Approved", "Rejected"] as const).map((f) => {
            const count =
              f === "All"
                ? vehicles.length
                : counts[f as VerificationStatus];
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f as VerificationStatus | "All")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {f} <span className="text-gray-400">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 h-20 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No vehicles match this filter.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-700">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-gray-800 text-gray-400 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Vehicle</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">Plate</th>
                <th className="px-4 py-3 text-left">Seats</th>
                <th className="px-4 py-3 text-left">Registration</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  className="border-t border-gray-700 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">
                      {v.make} {v.model}
                    </div>
                    <div className="text-xs text-gray-500">
                      Added {new Date(v.createdAt).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" })}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-white">{v.ownerName ?? "—"}</div>
                    <div className="text-xs text-gray-500 font-mono">
                      {v.ownerPhone ?? ""}
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono text-white">{v.plateNumber}</td>
                  <td className="px-4 py-3">{v.seats}</td>

                  <td className="px-4 py-3">
                    {v.registrationDocUrl ? (
                      <button
                        onClick={() =>
                          setModal({
                            url: `${BASE}${v.registrationDocUrl!}`,
                            label: `${v.make} ${v.model} — Registration`,
                          })
                        }
                        className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-gray-600"
                      >
                        🪪 View doc
                      </button>
                    ) : (
                      <span className="text-xs text-gray-600 italic">Not uploaded</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={v.verificationStatus} />
                    {v.verificationStatus === "Rejected" && v.rejectionReason ? (
                      <div
                        className="text-xs text-red-400 mt-1 max-w-[12rem]"
                        title={v.rejectionReason}
                      >
                        {v.rejectionReason}
                      </div>
                    ) : null}
                    {v.verificationStatus === "Approved" && v.verifiedAt ? (
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(v.verifiedAt).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" })}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(v.id)}
                        disabled={processing === v.id || v.verificationStatus === "Approved"}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {processing === v.id ? "…" : "Approve"}
                      </button>
                      <button
                        onClick={() => reject(v.id)}
                        disabled={processing === v.id || v.verificationStatus === "Rejected"}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal ? (
        <DocModal url={modal.url} label={modal.label} onClose={() => setModal(null)} />
      ) : null}
    </div>
  );
}
