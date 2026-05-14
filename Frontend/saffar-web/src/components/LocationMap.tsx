import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api";

interface Props {
  lat: number;
  lng: number;
}

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "180px",
  borderRadius: "10px",
  overflow: "hidden",
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#1d2535" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
  ],
};

export default function LocationMap({ lat, lng }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  });

  if (!isLoaded) {
    return (
      <div style={{ ...containerStyle, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#64748b", fontSize: "13px" }}>Loading map...</span>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={{ lat, lng }}
        zoom={15}
        options={mapOptions}
      >
        <Marker position={{ lat, lng }} />
      </GoogleMap>
    </div>
  );
}
