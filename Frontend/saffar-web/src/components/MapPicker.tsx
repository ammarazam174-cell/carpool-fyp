import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { useState } from "react";

type Props = {
  onSelect: (lat: number, lng: number) => void;
};

export default function MapPicker({ onSelect }: Props) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAP_KEY,
  });

  const [marker, setMarker] = useState<any>(null);

  if (!isLoaded) return <p>Loading map...</p>;

  return (
    <GoogleMap
      zoom={12}
      center={{ lat: 24.8607, lng: 67.0011 }} // Karachi
      mapContainerStyle={{ width: "100%", height: "300px" }}
      onClick={(e) => {
        const lat = e.latLng?.lat();
        const lng = e.latLng?.lng();

        setMarker({ lat, lng });
        onSelect(lat!, lng!);
      }}
    >
      {marker && <Marker position={marker} />}
    </GoogleMap>
  );
}