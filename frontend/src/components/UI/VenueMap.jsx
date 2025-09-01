import React from 'react';
import { GoogleMap } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px',
};

const sriLankaCenter = {
  lat: 7.8731,
  lng: 80.7718,
};

const VenueMap = ({ venues = [], pickMode = false, selectedLocation, onMapClick }) => {
  const isLoaded = window.google && window.google.maps;

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={selectedLocation || sriLankaCenter}
      zoom={selectedLocation ? 14 : 7}
      onClick={pickMode && onMapClick ? (e => onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() })) : undefined}
    >
             {pickMode && selectedLocation && (
         <div
           style={{
             position: 'absolute',
             left: '50%',
             top: '50%',
             transform: 'translate(-50%, -50%)',
             width: '20px',
             height: '20px',
             backgroundColor: '#4285F4',
             border: '2px solid white',
             borderRadius: '50%',
             boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
           }}
         />
       )}
       {!pickMode && venues.map((venue) =>
         venue.latitude && venue.longitude ? (
           <div
             key={venue.id}
             style={{
               position: 'absolute',
               left: `${((parseFloat(venue.longitude) + 180) / 360) * 100}%`,
               top: `${((90 - parseFloat(venue.latitude)) / 180) * 100}%`,
               width: '16px',
               height: '16px',
               backgroundColor: '#EA4335',
               border: '2px solid white',
               borderRadius: '50%',
               boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
               cursor: 'pointer'
             }}
             title={venue.name}
           />
         ) : null
       )}
    </GoogleMap>
  );
};

export default VenueMap; 