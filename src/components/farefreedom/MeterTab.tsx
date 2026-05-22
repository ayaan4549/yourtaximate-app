import React, { useState, useEffect, useRef } from "react";
import { AppSettings, Trip } from "../../types";
import { Play, Square, Save, MapPin, Compass, ShieldAlert, Award, Clock } from "lucide-react";

interface MeterTabProps {
  settings: AppSettings;
  onSaveTrip: (trip: Trip) => void;
}

export function MeterTab({ settings, onSaveTrip }: MeterTabProps) {
  // Meter state machine: "idle" | "running" | "stopped"
  const [meterStatus, setMeterStatus] = useState<"idle" | "running" | "stopped">("idle");
  const [customerName, setCustomerName] = useState("");
  const [destination, setDestination] = useState("");
  const [payMethod, setPayMethod] = useState<"card" | "cash">("card");

  // Telemetry trackers
  const [miles, setMiles] = useState(0);
  const [seconds, setSeconds] = useState(0);

  // Manual Speed Drive Simulator Toggle for testing
  const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);

  // Error logging
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Timers and Watches refs
  const secondTimerRef = useRef<NodeJS.Timeout | null>(null);
  const watchPositionIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Latency reference for Geolocation distance calculations
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Haversine method to accumulate mileage
  const calculateDeltaMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3958.8; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Compute actual fare dynamically
  const computedFare = settings.rates.baseFare + 
    (miles * settings.rates.perMileRate) + 
    ((seconds / 60) * settings.rates.perMinuteRate);

  const startMeter = () => {
    if (!destination.trim()) {
      alert("Destination address coordinate is strictly required before booting the GPS Meter.");
      return;
    }

    setMeterStatus("running");
    setSeconds(0);
    setMiles(0);
    lastCoordsRef.current = null;
    setGpsError(null);

    // 1. Boot seconds stopwatch
    secondTimerRef.current = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    // 2. Try HTML5 Geolocation Watch Position
    if (navigator.geolocation) {
      const handleGpsSuccess = (pos: GeolocationPosition) => {
        const { latitude, longitude } = pos.coords;
        if (lastCoordsRef.current) {
          const delta = calculateDeltaMiles(
            lastCoordsRef.current.lat,
            lastCoordsRef.current.lng,
            latitude,
            longitude
          );
          // filter out minor GPS jitter (only add delta if distance matches > 0.01 mi)
          if (delta > 0.01) {
            setMiles(prev => parseFloat((prev + delta).toFixed(2)));
          }
        }
        lastCoordsRef.current = { lat: latitude, lng: longitude };
      };

      const handleGpsError = (err: GeolocationPositionError) => {
        setGpsError(`GPS Geolocation: ${err.message}. Enabling Manual Travel Drive Simulator below as safe fallback.`);
      };

      watchPositionIdRef.current = navigator.geolocation.watchPosition(
        handleGpsSuccess,
        handleGpsError,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGpsError("This browser agent does not support Geolocation APIs. Enable simulated motion.");
    }

    // 3. Drive simulation loops
    if (isSimulatingDrive) {
      startMotionSimulation();
    }
  };

  const startMotionSimulation = () => {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    // Simulate cruising at 36 mph (0.01 miles every second)
    simIntervalRef.current = setInterval(() => {
      setMiles(prev => parseFloat((prev + 0.01).toFixed(2)));
    }, 1000);
  };

  const stopMeter = () => {
    setMeterStatus("stopped");

    if (secondTimerRef.current) {
      clearInterval(secondTimerRef.current);
      secondTimerRef.current = null;
    }
    if (watchPositionIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchPositionIdRef.current);
      watchPositionIdRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
  };

  const handleSaveMeterTrip = () => {
    const tripToSave: Trip = {
      id: "trip-meter-" + Date.now(),
      customerName: customerName.trim() || "Street Hail Meter Cab",
      pickupAddress: "Active Street GPS Origin",
      destinationAddress: destination,
      distanceMiles: miles,
      fareGbp: parseFloat(computedFare.toFixed(2)),
      paymentMethod: payMethod,
      dateTime: new Date().toISOString(),
      mode: "Meter"
    };

    onSaveTrip(tripToSave);

    // Reset fields
    setCustomerName("");
    setDestination("");
    setMiles(0);
    setSeconds(0);
    setMeterStatus("idle");
  };

  // Keep simulator in sync if toggled during running statuses
  useEffect(() => {
    if (meterStatus === "running") {
      if (isSimulatingDrive) {
        startMotionSimulation();
      } else {
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
      }
    }
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [isSimulatingDrive, meterStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (secondTimerRef.current) clearInterval(secondTimerRef.current);
      if (watchPositionIdRef.current !== null) navigator.geolocation.clearWatch(watchPositionIdRef.current);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  // Format Elapsed Timer counter
  const formatTimer = (totSec: number) => {
    const hrs = Math.floor(totSec / 3600);
    const mins = Math.floor((totSec % 3600) / 60);
    const secs = totSec % 60;
    return `${hrs < 10 ? "0" + hrs : hrs}:${mins < 10 ? "0" + mins : mins}:${secs < 10 ? "0" + secs : secs}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Hand Huge Digital Fare Display LED meter (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden text-center flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />
          
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <span className="text-[10px] font-mono text-slate-400 select-none tracking-widest uppercase">
              🚨 TfL Tariffs Encrypted Meter 2026
            </span>
            <div className="flex items-center gap-1.5 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold uppercase animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {meterStatus.toUpperCase()}
            </div>
          </div>

          <div className="py-10 space-y-1">
            <span className="text-slate-400 text-xs font-mono font-bold tracking-tight uppercase">CURRENT FARE</span>
            <div className="text-6xl font-black text-amber-500 select-all font-mono tracking-tighter">
              £{computedFare.toFixed(2)}
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight font-bold">
              Base: £{settings.rates.baseFare.toFixed(2)} · Rates: £{settings.rates.perMileRate.toFixed(2)}/mi · £{settings.rates.perMinuteRate.toFixed(2)}/min
            </p>
          </div>

          {/* Core dynamic telemetry figures */}
          <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-5">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Odometer Run</span>
              <span className="text-xl font-black font-mono mt-1 block tracking-tight text-white">{miles} mi</span>
              <span className="text-[9px] text-slate-500 font-mono italic block">Total distance traversed</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Time Elapsed</span>
              <span className="text-xl font-black font-mono mt-1 block tracking-tight text-white">{formatTimer(seconds)}</span>
              <span className="text-[9px] text-slate-500 font-mono italic block">Stopwatch duration elapsed</span>
            </div>
          </div>

          {/* Action trigger mechanics */}
          <div className="mt-6 flex gap-3">
            {meterStatus === "idle" ? (
              <button 
                onClick={startMeter}
                className="flex-1 py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
              >
                <Play className="w-4 h-4 fill-slate-950" /> Start Meter Journey
              </button>
            ) : meterStatus === "running" ? (
              <button 
                onClick={stopMeter}
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-600/10"
              >
                <Square className="w-4 h-4 fill-white animate-pulse" /> Freeze &amp; Halt Duty
              </button>
            ) : (
              <div className="flex-1 flex gap-2">
                <button 
                  onClick={() => setMeterStatus("running")}
                  className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-sans text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Resume
                </button>
                <button 
                  onClick={handleSaveMeterTrip}
                  className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Completed Trip
                </button>
              </div>
            )}
          </div>

          {/* GPS alerts notifications */}
          {gpsError && (
            <div className="mt-4 p-3 bg-red-950/20 text-red-400 border border-red-900/40 rounded-xl text-left text-[10px] leading-relaxed flex items-start gap-1.5 font-mono">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />
              <p>{gpsError}</p>
            </div>
          )}
        </div>

        {/* Right Hand Meter Configurations Inputs Sheet (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-900 border-b border-slate-50 pb-2">
            Trip Coordinate Details
          </h3>

          <div className="space-y-3.5">
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">
                Destination Address Destination point <strong className="text-red-500">*</strong>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-bounce" />
                <input
                  type="text"
                  required
                  placeholder="e.g. London City Airport (LCY)"
                  disabled={meterStatus !== "idle"}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-xl py-2 pl-9 pr-3 text-xs"
                />
              </div>
              <span className="text-[9px] text-slate-400 mt-1 block leading-tight">
                Required to lock target coordinates for route insurance before enabling meter.
              </span>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">
                Passenger / Cust Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Walk-up Passenger Street Hail"
                disabled={meterStatus !== "idle"}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-xl p-2 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as "card" | "cash")}
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-xl p-2.5 text-xs font-bold font-sans"
              >
                <option value="card">💳 Card/Visa Terminal</option>
                <option value="cash">💵 Traditional Cash Receipt</option>
              </select>
            </div>

            {/* Travel drive motion speed simulator switcher */}
            <div className="pt-3 border-t border-slate-50 space-y-3">
              <div className="flex items-center justify-between text-xs font-sans text-slate-700">
                <span className="font-extrabold text-blue-800 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 animate-spin font-bold" /> Engine Drive Simulator Override
                </span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isSimulatingDrive}
                    onChange={(e) => setIsSimulatingDrive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Useful if browser-based high-accuracy GPS permissions are disabled in your sandbox. Cruising at 36mph on this toggle simulates steady physical car motion!
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
