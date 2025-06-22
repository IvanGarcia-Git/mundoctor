
import React from 'react';
import { MapPin } from 'lucide-react';

const MapPlaceholder = ({ userLocation, professionals }) => {
  const centerLat = userLocation?.lat || professionals?.[0]?.lat || 40.416775;
  const centerLng = userLocation?.lng || professionals?.[0]?.lng || -3.703790;

  return (
    <div className="w-full h-full bg-gray-800 rounded-xl border border-gray-700/50 overflow-hidden shadow-xl flex flex-col items-center justify-center">
      <MapPin size={48} className="text-blue-400 mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">Cargando Mapa Interactivo</h3>
      <p className="text-sm text-gray-400 text-center px-4">
        El mapa interactivo con las ubicaciones se mostrará aquí en breve.
      </p>
      <p className="text-xs text-gray-500 mt-4">
        Lat: {centerLat.toFixed(4)}, Lng: {centerLng.toFixed(4)}
      </p>
    </div>
  );
};

export default MapPlaceholder;
