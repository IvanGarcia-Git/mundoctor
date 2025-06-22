
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

const UserMarker = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);

  const userIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'hue-rotate-180 saturate-200' 
  });
  
  return <Marker position={position} icon={userIcon}><Popup>Tu ubicación</Popup></Marker>;
};

const ProfessionalMarker = ({ professional }) => {
  const professionalIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <Marker position={[professional.lat, professional.lng]} icon={professionalIcon}>
      <Popup>
        <div className="text-sm">
          <h3 className="font-bold text-base mb-1">{professional.name}</h3>
          <p className="text-blue-600 mb-0.5">{professional.specialty}</p>
          <p className="text-gray-600 flex items-center"><MapPin size={12} className="mr-1" />{professional.city}</p>
        </div>
      </Popup>
    </Marker>
  );
};


const InteractiveMap = ({ userLocation, professionals }) => {
  const mapRef = useRef();
  const defaultPosition = [userLocation?.lat || 40.416775, userLocation?.lng || -3.703790];
  const zoomLevel = userLocation ? 13 : 6;

  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);


  return (
    <MapContainer 
        center={defaultPosition} 
        zoom={zoomLevel} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        whenCreated={mapInstance => { mapRef.current = mapInstance; }}
        className="rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userLocation && <UserMarker position={[userLocation.lat, userLocation.lng]} />}
      {professionals.map(prof => (
        <ProfessionalMarker key={prof.id} professional={prof} />
      ))}
    </MapContainer>
  );
};

export default InteractiveMap;
