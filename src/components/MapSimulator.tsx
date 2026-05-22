import React, { useEffect, useState, useRef } from "react";
import { MapPin, Navigation, Compass, Shield, Orbit } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface Landmark {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  // Screen coordinate coordinates for beautiful custom canvas mapping (percentage)
  x: number; 
  y: number;
}

export const LONDON_LANDMARKS: Landmark[] = [
  { id: "heathrow", name: "Heathrow Airport (LHR)", lat: 51.4700, lng: -0.4543, description: "Terminal 2 & 5 Forecourts", x: 15, y: 75 },
  { id: "buckingham", name: "Buckingham Palace", lat: 51.5014, lng: -0.1419, description: "Main Gates Mall", x: 48, y: 52 },
  { id: "kings_cross", name: "Kings Cross Station", lat: 51.5309, lng: -0.1233, description: "Euston Road pickup zone", x: 55, y: 28 },
  { id: "tower_bridge", name: "Tower Bridge", lat: 51.5055, lng: -0.0754, description: "Tower Bridge South Arrival", x: 74, y: 55 },
  { id: "piccadilly", name: "Piccadilly Circus", lat: 51.5101, lng: -0.1340, description: "Shaftesbury Avenue side", x: 46, y: 44 },
  { id: "wembley", name: "Wembley Stadium", lat: 51.5560, lng: -0.2796, description: "Wembley Way dropoff loop", x: 28, y: 20 },
  { id: "greenwich", name: "Greenwich Park", lat: 51.4800, lng: 0.0003, description: "Royal Observatory Gates", x: 88, y: 72 },
];

export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return parseFloat(distance.toFixed(2));
}

interface MapSimulatorProps {
  pickup: Landmark | null;
  dropoff: Landmark | null;
  setPickup: (landmark: Landmark) => void;
  setDropoff: (landmark: Landmark) => void;
  bookingStatus: "idle" | "requesting" | "accepted" | "en_route" | "completed";
  driverName?: string;
}

export function MapSimulator({
  pickup,
  dropoff,
  setPickup,
  setDropoff,
  bookingStatus,
  driverName,
}: MapSimulatorProps) {
  const [carProgress, setCarProgress] = useState(0);
  const [carPosition, setCarPosition] = useState({ x: 0, y: 0 });
  const [isDriving, setIsDriving] = useState(false);

  // Simple animation for the driver car traversing the route
  useEffect(() => {
    if (bookingStatus === "en_route") {
      setIsDriving(true);
      setCarProgress(0);
      const interval = setInterval(() => {
        setCarProgress((prev) => {
          if (prev >= 1) {
            clearInterval(interval);
            setIsDriving(false);
            return 1;
          }
          return prev + 0.01;
        });
      }, 50);
      return () => clearInterval(interval);
    } else {
      setIsDriving(false);
      setCarProgress(0);
    }
  }, [bookingStatus]);

  // Calculate mid-points for the car representing coordinates
  useEffect(() => {
    if (pickup && dropoff) {
      const startX = pickup.x;
      const startY = pickup.y;
      const endX = dropoff.x;
      const endY = dropoff.y;

      // Add a slight arc to make the route look natural, not a flat straight line
      const t = carProgress;
      const currentX = startX + (endX - startX) * t;
      // Parabolic offset for curve height
      const h = 8; // Max curve offset
      const currentY = startY + (endY - startY) * t - Math.sin(t * Math.PI) * h;

      setCarPosition({ x: currentX, y: currentY });
    }
  }, [carProgress, pickup, dropoff]);

  return (
    <div className="relative w-full h-80 sm:h-96 md:h-[420px] bg-[#111625] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl select-none">
      {/* Background Micro Route Vector Grid */}
      <div 
        className="absolute inset-0 bg-grid opacity-[0.06]" 
        style={{
          backgroundImage: `
            radial-gradient(circle, #3b82f6 1px, transparent 1px),
            linear-gradient(to right, rgba(148, 163, 184, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px, 48px 48px, 48px 48px",
        }}
      />

      {/* Modern Compact GPS Status Overlay */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-center gap-1 bg-[#1e293b]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700 shadow-lg">
        <Compass className="w-4 h-4 text-blue-500 animate-[spin_8s_linear_infinite]" />
        <span className="text-[8px] font-mono font-bold text-blue-400 tracking-wider uppercase">GPS ACTIVE</span>
      </div>

      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-[#1e293b]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-[9px] font-mono text-slate-300 shadow-md">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <span>LONDON TFL DISPATCH AREA</span>
      </div>

      {/* Connection Route Vector Path */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {pickup && dropoff && (
          <>
            {/* Glowing path baseline */}
            <path
              d={`M ${pickup.x}% ${pickup.y}% Q ${(pickup.x + dropoff.x) / 2}% ${Math.min(pickup.y, dropoff.y) - 10}% ${dropoff.x}% ${dropoff.y}%`}
              fill="none"
              stroke="#2563eb"
              strokeWidth="5"
              strokeOpacity="0.2"
              className="animate-pulse"
            />
            {/* Highly readable main route line */}
            <path
              id="route-polyline"
              d={`M ${pickup.x}% ${pickup.y}% Q ${(pickup.x + dropoff.x) / 2}% ${Math.min(pickup.y, dropoff.y) - 10}% ${dropoff.x}% ${dropoff.y}%`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3.5"
              strokeDasharray="8 5"
              strokeOpacity="0.95"
              className="animate-[dash_25s_linear_infinite]"
              style={{ strokeDashoffset: -100 }}
            />
          </>
        )}
      </svg>

      {/* Street Network Accent Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none">
        <path d="M 0 100 Q 250 80 500 120 T 1000 60" fill="none" stroke="white" strokeWidth="1" />
        <path d="M 120 0 Q 350 400 450 600" fill="none" stroke="white" strokeWidth="1" />
        <path d="M 0 320 Q 400 200 800 380" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="5" />
        <path d="M 280 0 Q 300 180 600 500" fill="none" stroke="white" strokeWidth="1" />
        <path d="M 700 0 A 400 400 0 0 1 100 600" fill="none" stroke="white" strokeWidth="1.2" />
      </svg>

      {/* Interactive Landmark Pins */}
      {LONDON_LANDMARKS.map((landmark) => {
        const isPickup = pickup?.id === landmark.id;
        const isDropoff = dropoff?.id === landmark.id;
        const isSelected = isPickup || isDropoff;

        return (
          <div
            key={landmark.id}
            style={{ left: `${landmark.x}%`, top: `${landmark.y}%` }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
          >
            {/* Button wrapper for selecting landmarks */}
            <button
              onClick={() => {
                if (bookingStatus !== "idle") return; // Block changes during active dispatch simulation
                if (!pickup) {
                  setPickup(landmark);
                } else if (pickup.id === landmark.id) {
                  // Deselect pickup
                  // @ts-ignore
                  setPickup(null);
                } else {
                  setDropoff(landmark);
                }
              }}
              className="group relative flex items-center justify-center focus:outline-none animate-fade-in"
            >
              {/* Radial locator wave around selected anchors */}
              {isSelected && (
                <span className={`absolute w-12 h-12 rounded-full animate-ping opacity-25 ${isPickup ? "bg-blue-500" : "bg-emerald-500"}`} />
              )}
              
              {/* High-visibility pure-white popover details */}
              <div className="absolute bottom-9 left-1/2 -translate-x-1/2 bg-white border border-slate-100 px-3 py-2 rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-30 shadow-2xl whitespace-nowrap text-left">
                <p className="text-[11px] font-bold text-slate-900">{landmark.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{landmark.description}</p>
                <p className="text-[9px] text-blue-600 font-semibold font-mono mt-0.5">{landmark.lat.toFixed(4)}N, {landmark.lng.toFixed(4)}W</p>
              </div>

              {/* Graphical Pin Node with specific high-contrast color codes */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                  isPickup
                    ? "bg-blue-600 border-2 border-white text-white scale-110"
                    : isDropoff
                    ? "bg-emerald-600 border-2 border-white text-white scale-110"
                    : "bg-white border border-slate-300 hover:border-slate-400 text-slate-500 hover:text-slate-700"
                }`}
              >
                {isPickup ? (
                  <MapPin className="w-4 h-4 fill-white/20" />
                ) : isDropoff ? (
                  <MapPin className="w-4 h-4 fill-white/20" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-slate-600" />
                )}
              </div>

              {/* Professional high-contrast map tags */}
              {isSelected && (
                <div 
                  className={`absolute top-8 px-2 py-0.5 text-[8px] font-mono font-bold uppercase rounded-md tracking-wider shadow whitespace-nowrap border ${
                    isPickup 
                      ? "bg-blue-600 border-blue-600 text-white" 
                      : "bg-emerald-600 border-emerald-600 text-white"
                  }`}
                >
                  {isPickup ? "PICKUP" : "DROPOFF"}
                </div>
              )}
            </button>
          </div>
        );
      })}

      {/* Professional Ride Dispatch Tracker Visuals */}
      <AnimatePresence>
        {isDriving && (
          <motion.div
            style={{ left: `${carPosition.x}%`, top: `${carPosition.y}%` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
          >
            <div className="flex flex-col items-center">
              {/* Active travel radar rings */}
              <span className="absolute w-10 h-10 rounded-full bg-blue-500/25 animate-ping" />
              <div className="bg-blue-600 border-2 border-white text-white p-2 rounded-full shadow-2xl h-10 w-10 flex items-center justify-center transform rotate-45">
                <Navigation className="w-5 h-5 fill-white" style={{ transform: "rotate(-45deg)" }} />
              </div>
              <span className="mt-1.5 px-2 py-0.5 text-[8px] font-sans font-bold uppercase bg-amber-400 text-slate-900 rounded-lg shadow-md whitespace-nowrap tracking-wide">
                {driverName ? `${driverName} (DRIVER ACTIVE)` : "DRIVER (ACTIVE)"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner Guidelines - Replaces cyberpunk lines with polished cards */}
      {!pickup && (
        <div className="absolute inset-x-4 top-4 bg-white/95 border border-slate-200 p-4 rounded-xl shadow-xl flex items-center gap-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 text-blue-600 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Licensed UK Dispatch Platform</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Click any approved hotspot or custom location on the map to select pickup.</p>
          </div>
        </div>
      )}

      {pickup && !dropoff && (
        <div className="absolute inset-x-4 top-4 bg-white/95 border border-slate-200 p-4 rounded-xl shadow-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 text-emerald-600 shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Pickup set to {pickup.name.split(" (")[0]}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Excellent. Now click your destination hotspot on the map to pre-book.</p>
          </div>
        </div>
      )}
    </div>
  );
}
