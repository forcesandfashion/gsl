"use client";
import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FaMapMarkerAlt, FaLocationArrow } from "react-icons/fa";
import { MdMyLocation } from "react-icons/md";
import { createRoot } from "react-dom/client";

const Map = ({ ranges, selectedRange, onLocationFound }) => {
  const mapRef = useRef(null); // Reference to store the map instance
  const markersRef = useRef([]); // Reference to store markers
  const userMarkerRef = useRef(null); // Reference to store user location marker
  const [userLocation, setUserLocation] = useState(null);
  const [locationRequested, setLocationRequested] = useState(false);

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("map").setView([20.5937, 78.9629], 5); // Default India view
      mapRef.current = map;

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      
      // Add zoom control to bottom left (default position)
      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Automatically request user location when map loads
      requestUserLocation();
    }
  }, []);

  // Function to request user location
  const requestUserLocation = () => {
    if (navigator.geolocation && !locationRequested) {
      setLocationRequested(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = { latitude, longitude };
          setUserLocation(location);
          
          // Add user location marker
          addUserLocationMarker(latitude, longitude);
          
          // Notify parent component
          if (onLocationFound) {
            onLocationFound(location);
          }
          
          // Zoom to user location
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 10);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          // Still allow manual location request later
          setLocationRequested(false);
        }
      );
    }
  };

  // Function to add user location marker
  const addUserLocationMarker = (lat, lng) => {
    if (mapRef.current) {
      // Remove existing user marker
      if (userMarkerRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current);
      }

      // Create blue marker for user location
      const userIconElement = document.createElement("div");
      const root = createRoot(userIconElement);
      root.render(
        <div style={{ position: 'relative' }}>
          <FaMapMarkerAlt style={{ color: "#007bff", fontSize: "28px", filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))" }} />
          <div style={{ 
            position: 'absolute', 
            top: '6px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            width: '8px', 
            height: '8px', 
            backgroundColor: 'white', 
            borderRadius: '50%',
            border: '2px solid #007bff'
          }} />
        </div>
      );

      const userCustomIcon = L.divIcon({
        html: userIconElement,
        className: "custom-user-marker",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const userMarker = L.marker([lat, lng], {
        icon: userCustomIcon,
      })
        .addTo(mapRef.current)
        .bindPopup(`<b>Your Location</b><br>Click the location button to return here`)
        .openPopup();
        
      userMarkerRef.current = userMarker;
    }
  };

  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;

      // Remove previous range markers (but keep user marker)
      markersRef.current.forEach(marker => {
        if (marker !== userMarkerRef.current) {
          map.removeLayer(marker);
        }
      });
      markersRef.current = userMarkerRef.current ? [userMarkerRef.current] : [];

      // Add new range markers
      ranges.forEach((range) => {
        if (range.latitude && range.longitude) {
          const iconElement = document.createElement("div");
          const root = createRoot(iconElement);
          root.render(
            <FaMapMarkerAlt style={{ color: "#dc3545", fontSize: "24px", filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))" }} />
          );

          const customIcon = L.divIcon({
            html: iconElement,
            className: "custom-range-marker",
            iconSize: [24, 24],
            iconAnchor: [12, 24],
          });

          const marker = L.marker([range.latitude, range.longitude], {
            icon: customIcon,
          })
            .addTo(map)
            .bindPopup(`
              <div style="min-width: 200px;">
                <b>${range.name}</b><br>
                <p style="margin: 4px 0; font-size: 12px; color: #666;">${range.address}</p>
                <p style="margin: 4px 0; font-size: 12px;"><strong>Status:</strong> ${range.status}</p>
                <p style="margin: 4px 0; font-size: 12px;"><strong>Hours:</strong> ${range.openingHours}</p>
                ${range.price ? `<p style="margin: 4px 0; font-size: 12px;"><strong>Price:</strong> ₹${range.price}</p>` : ''}
              </div>
            `);

          marker.on("click", () => {
            map.setView([range.latitude, range.longitude], 12); // Zoom in on marker click
          });
          
          markersRef.current.push(marker);
        }
      });
    }
  }, [ranges]);

  // Zoom to selected range when clicked from the list
  useEffect(() => {
    if (mapRef.current && selectedRange && selectedRange.latitude && selectedRange.longitude) {
      mapRef.current.setView(
        [selectedRange.latitude, selectedRange.longitude],
        12
      );
    }
  }, [selectedRange]);

  // Function to zoom to India
  const zoomToIndia = () => {
    if (mapRef.current) {
      mapRef.current.setView([20.5937, 78.9629], 5);
    }
  };

  // Function to zoom to user's location
  const zoomToUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView([userLocation.latitude, userLocation.longitude], 12);
      // Open the user location popup
      if (userMarkerRef.current) {
        userMarkerRef.current.openPopup();
      }
    } else {
      // Request location if not already available
      requestUserLocation();
    }
  };

  return (
    <div className="relative w-full h-96 rounded-lg shadow-lg">
      <div id="map" className="w-full h-full"></div>
      
      {/* Map Controls - Positioned to avoid conflict with Leaflet controls */}
      <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-2">
        {/* My Location Button - Most prominent */}
        <button 
          onClick={zoomToUserLocation}
          className={`p-3 rounded-lg shadow-lg transition-all duration-200 border-2 ${
            userLocation 
              ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white shadow-xl' 
              : 'bg-white hover:bg-blue-50 border-blue-300 text-blue-600 hover:border-blue-400'
          }`}
          title={userLocation ? "Go to my location" : "Find my location"}
        >
          <MdMyLocation className="text-xl" />
        </button>
        
        {/* Zoom to India Button */}
        <button 
          onClick={zoomToIndia}
          className="bg-white p-3 rounded-lg shadow-lg hover:bg-orange-50 transition-all duration-200 border border-gray-200 hover:border-orange-300"
          title="Zoom to India"
        >
          <div className="flex items-center justify-center">
            <span className="text-orange-600 font-bold text-sm">🇮🇳</span>
          </div>
        </button>
      </div>

      {/* Location Status Indicator */}
      {userLocation && (
        <div className="absolute bottom-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Location Found
          </div>
        </div>
      )}
      
      {/* Loading indicator when requesting location */}
      {locationRequested && !userLocation && (
        <div className="absolute bottom-2 left-2 bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-white rounded-full animate-spin"></div>
            Finding location...
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;