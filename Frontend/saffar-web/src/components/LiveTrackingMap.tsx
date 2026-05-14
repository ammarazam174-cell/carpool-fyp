import { useEffect, useRef, useState } from "react";
import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api";
import connection, { startSignalR } from "../services/signalr";
import api from "../api/axios";

const CAR_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <circle cx="24" cy="24" r="24" fill="#1d4ed8"/>
  <g transform="translate(9 12)" fill="white">
    <path d="M28.5 9.5 26 3H4L1.5 9.5H0V22h3v2h4v-2h16v2h4v-2h3V9.5h-1.5z
             M5 9.5 6.7 5h16.6L25 9.5H5zM4 18a2 2 0 110-4 2 2 0 010 4z
             M26 18a2 2 0 110-4 2 2 0 010 4z"/>
  </g>
</svg>`);

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry",            stylers: [{ color: "#1d2535" }] },
  { elementType: "labels.text.fill",    stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke",  stylers: [{ color: "#1a3646" }] },
  { featureType: "road", elementType: "geometry",         stylers: [{ color: "#304a7d" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
  { featureType: "water", elementType: "geometry",        stylers: [{ color: "#0e1626" }] },
  { featureType: "poi",                                   stylers: [{ visibility: "off" }] },
];

interface Props {
  rideId: string;
  initialDriverLat?: number;
  initialDriverLng?: number;
}

type LatLng = { lat: number; lng: number };

export default function LiveTrackingMap({ rideId, initialDriverLat, initialDriverLng }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  });

  const hasInitialPos = !!(initialDriverLat && initialDriverLng);
  const [driverPos, setDriverPos] = useState<LatLng | null>(
    hasInitialPos ? { lat: initialDriverLat!, lng: initialDriverLng! } : null
  );
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [following, setFollowing] = useState(true);

  const mapRef    = useRef<google.maps.Map | null>(null);
  const followRef = useRef(following);
  useEffect(() => { followRef.current = following; }, [following]);

  // One-time fetch of last known position before first SignalR push
  useEffect(() => {
    if (hasInitialPos) return;
    api.get(`/rides/${rideId}/location`).then((res) => {
      if (res.data.driverLat && res.data.driverLng)
        setDriverPos({ lat: res.data.driverLat, lng: res.data.driverLng });
    }).catch(() => {});
  }, [rideId]);

  // SignalR — real-time driver location
  useEffect(() => {
    startSignalR();

    const handler = (data: { rideId: string; lat: number; lng: number }) => {
      if (data.rideId !== rideId) return;
      const newPos: LatLng = { lat: data.lat, lng: data.lng };
      setDriverPos(newPos);
      setUpdatedAt(new Date());
      if (followRef.current) mapRef.current?.panTo(newPos);
    };

    connection.on("DriverLocationUpdated", handler);
    return () => connection.off("DriverLocationUpdated", handler);
  }, [rideId]);

  if (!isLoaded || !driverPos) {
    return (
      <div
        className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center"
        style={{ height: 220 }}
      >
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <span className="text-xs">
            {!isLoaded ? "Loading map…" : "Waiting for driver location…"}
          </span>
        </div>
      </div>
    );
  }

  const carIcon: google.maps.Icon = {
    url:        `data:image/svg+xml;charset=UTF-8,${CAR_SVG}`,
    scaledSize: new window.google.maps.Size(48, 48),
    anchor:     new window.google.maps.Point(24, 24),
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-indigo-800 shadow-lg">

      {/* Header */}
      <div className="bg-indigo-950 border-b border-indigo-900 px-4 py-2.5 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"/>
        </span>
        <p className="text-white font-bold text-sm">🚗 Live Tracking</p>
        <span className="ml-auto text-xs text-indigo-300 bg-indigo-900 px-2.5 py-1 rounded-full font-semibold">
          On the way
        </span>
      </div>

      {/* Map */}
      <div className="relative">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "260px" }}
          center={driverPos}
          zoom={15}
          options={{
            disableDefaultUI: true,
            zoomControl:      true,
            styles:           DARK_STYLE,
          }}
          onLoad={(map) => { mapRef.current = map; }}
          onDragStart={() => setFollowing(false)}
        >
          <Marker
            position={driverPos}
            icon={carIcon}
            title="Driver"
            zIndex={10}
          />
        </GoogleMap>

        {/* Follow Driver button */}
        {!following && (
          <button
            onClick={() => { setFollowing(true); mapRef.current?.panTo(driverPos!); }}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95"
          >
            📍 Follow Driver
          </button>
        )}

        {/* Live badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-900/90 text-green-400 text-xs font-semibold px-2.5 py-1.5 rounded-full backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"/>
          </span>
          Live
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-2">
        <p className="text-xs text-slate-500">
          {updatedAt
            ? `Location updated ${updatedAt.toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi" })}`
            : "Waiting for first update…"}
        </p>
      </div>
    </div>
  );
}
