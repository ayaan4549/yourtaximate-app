import React, { useState, useEffect } from "react";
import { AppSettings, DriverProfileSettings } from "../../types";
import { 
  Car, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Settings, 
  TrendingUp, 
  Fuel, 
  Wrench, 
  Disc, 
  Plus, 
  Trash2, 
  CheckCircle,
  Activity,
  DollarSign
} from "lucide-react";

interface VehicleTabProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

// Sub-States local persist helpers
interface FuelEntry {
  id: string;
  date: string;
  odometer: number;
  litres: number;
  cost: number;
  station: string;
}

interface ServiceEntry {
  id: string;
  date: string;
  mileage: number;
  description: string;
  garage: string;
  cost: number;
}

export function VehicleTab({ settings, onUpdateSettings }: VehicleTabProps) {
  // Tab control within Vehicle tab: "dates", "fuel", "service", "tyres"
  const [subTab, setSubTab] = useState<"dates" | "fuel" | "service" | "tyres">("dates");

  // Local state for vehicle profile (which syncs upstream on save)
  const [make, setMake] = useState(settings.profile.vehicleMake || "Mercedes-Benz");
  const [model, setModel] = useState(settings.profile.vehicleModel || "E-Class");
  const [reg, setReg] = useState(settings.profile.vehicleReg || "LR23 XTM");
  const [color, setColor] = useState(settings.profile.vehicleColor || "Obsidian Black");

  // Expiries (can be persisted inside profile setting extensions, or defaults)
  const [motExpiry, setMotExpiry] = useState("2027-02-10");
  const [serviceDue, setServiceDue] = useState("2026-04-14"); // default past to trigger "Expired" text matching screen
  const [insuranceExpiry, setInsuranceExpiry] = useState("2027-04-20");
  const [roadTaxExpiry, setRoadTaxExpiry] = useState("2027-02-28");

  // Fuel list state
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>(() => {
    const cached = localStorage.getItem("farefreedom_fuel_entries");
    return cached ? JSON.parse(cached) : [
      { id: "fuel-1", date: "2026-05-18", odometer: 42100, litres: 45.5, cost: 68.20, station: "Shell Heathrow" },
      { id: "fuel-2", date: "2026-05-12", odometer: 41650, litres: 42.0, cost: 63.80, station: "BP Regent Str" }
    ];
  });

  // Service History list state
  const [serviceEntries, setServiceEntries] = useState<ServiceEntry[]>(() => {
    const cached = localStorage.getItem("farefreedom_service_entries");
    return cached ? JSON.parse(cached) : [
      { id: "serv-1", date: "2025-05-01", mileage: 30400, description: "Full diagnostics service, cabin filters, engine oil wash", garage: "Mercedes Brent Cross", cost: 380.00 },
      { id: "serv-2", date: "2026-01-15", mileage: 39150, description: "Front brake pads replaces, fluid bleed", garage: "Kwik Fit London", cost: 185.00 }
    ];
  });

  // Tyre states
  const [tyres, setTyres] = useState(() => {
    return {
      frontLeft: 7.2,
      frontRight: 6.8,
      rearLeft: 5.5,
      rearRight: 5.9
    };
  });

  // Local fuel inputs
  const [fuelOdometer, setFuelOdometer] = useState("");
  const [fuelLitres, setFuelLitres] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [fuelStation, setFuelStation] = useState("");

  // Local service inputs
  const [serviceMil, setServiceMil] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [serviceGarage, setServiceGarage] = useState("");
  const [servicePrice, setServicePrice] = useState("");

  // Upstream sync
  const handleSaveProfileDates = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      ...settings,
      profile: {
        ...settings.profile,
        vehicleMake: make,
        vehicleModel: model,
        vehicleReg: reg,
        vehicleColor: color
      }
    };
    onUpdateSettings(updated);
    alert("Vehicle profile dates uploaded successfully!");
  };

  // Cache Fuel & workshop logs
  useEffect(() => {
    localStorage.setItem("farefreedom_fuel_entries", JSON.stringify(fuelEntries));
  }, [fuelEntries]);

  useEffect(() => {
    localStorage.setItem("farefreedom_service_entries", JSON.stringify(serviceEntries));
  }, [serviceEntries]);

  // Calculations for dates countdowns (Slide 2)
  const calculateDaysDiff = (targetStr: string) => {
    const target = new Date(targetStr);
    const today = new Date();
    // Reset hours
    target.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderDaysBadge = (days: number) => {
    if (days < 0) {
      return (
        <span className="text-rose-600 bg-rose-50 border border-rose-100 font-extrabold text-[10.5px] px-2.5 py-1 rounded-lg">
          Expired {Math.abs(days)}d ago
        </span>
      );
    } else if (days <= 30) {
      return (
        <span className="text-amber-600 bg-amber-50 border border-amber-100 font-extrabold text-[10.5px] px-2.5 py-1 rounded-lg animate-pulse">
          ⚡ Expiring in {days}d
        </span>
      );
    } else {
      return (
        <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 font-extrabold text-[10.5px] px-2.5 py-1 rounded-lg">
          {days}d remaining
        </span>
      );
    }
  };

  // Fuel logging helper
  const handleAddFuel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelCost || !fuelLitres) return;

    const newEnt: FuelEntry = {
      id: "fuel-" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      odometer: parseInt(fuelOdometer) || (fuelEntries[0]?.odometer + 350) || 42500,
      litres: parseFloat(fuelLitres),
      cost: parseFloat(fuelCost),
      station: fuelStation || "Texaco Service"
    };

    setFuelEntries([newEnt, ...fuelEntries]);
    setFuelOdometer("");
    setFuelLitres("");
    setFuelCost("");
    setFuelStation("");
  };

  // Service helper
  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceDesc || !servicePrice) return;

    const newEnt: ServiceEntry = {
      id: "serv-" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      mileage: parseInt(serviceMil) || 43000,
      description: serviceDesc,
      garage: serviceGarage || "Independent Workshop",
      cost: parseFloat(servicePrice)
    };

    setServiceEntries([newEnt, ...serviceEntries]);
    setServiceDesc("");
    setServiceGarage("");
    setServiceMil("");
    setServicePrice("");
  };

  const avgCostPerLitre = fuelEntries.length > 0 
    ? (fuelEntries.reduce((sum, e) => sum + e.cost, 0) / fuelEntries.reduce((sum, e) => sum + e.litres, 0)).toFixed(3)
    : "1.520";

  return (
    <div className="space-y-6 text-xs font-sans">
      
      {/* Title banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-50 pb-3">
        <div>
          <h3 className="text-lg font-black font-display text-slate-900 tracking-tight">Vehicle Health &amp; Logs</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Maintain UK licensing standards and private hire compliance records</p>
        </div>

        {/* Sub Navigation Segment buttons (Profile & Dates, Fuel Log, Service History, Tyres) */}
        <div className="flex bg-slate-100 p-1 rounded-xl select-none max-w-sm shrink-0">
          <button
            onClick={() => setSubTab("dates")}
            className={`px-3 py-1.5 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer ${
              subTab === "dates" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            Profile &amp; Dates
          </button>
          <button
            onClick={() => setSubTab("fuel")}
            className={`px-3 py-1.5 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer ${
              subTab === "fuel" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            Fuel Log
          </button>
          <button
            onClick={() => setSubTab("service")}
            className={`px-3 py-1.5 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer ${
              subTab === "service" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            Service History
          </button>
          <button
            onClick={() => setSubTab("tyres")}
            className={`px-3 py-1.5 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer ${
              subTab === "tyres" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            Tyres
          </button>
        </div>
      </div>

      {/* SUB-TAB VIEWPORT REDIRECT */}
      
      {/* 1. PROFILE & DATES (Slide 2) */}
      {subTab === "dates" && (
        <form onSubmit={handleSaveProfileDates} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Form Left fields */}
          <div className="lg:col-span-8 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-50 pb-2 block flex items-center gap-1.5">
              <Car className="w-4 h-4 text-indigo-500" />
              Vehicle Specifications &amp; Regulatory Expiries
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-black block">Vehicle Make</label>
                <input
                  type="text"
                  required
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-black block">Vehicle Model</label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-black block">Registration Plate (UK)</label>
                <input
                  type="text"
                  required
                  value={reg}
                  onChange={(e) => setReg(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold font-mono tracking-widest text-slate-800 uppercase"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-black block">Body Colour</label>
                <input
                  type="text"
                  required
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-50 pt-4">
              <div className="space-y-1">
                <label className="text-[9.5px] text-slate-500 uppercase font-black block">MOT Expiry</label>
                <input
                  type="date"
                  required
                  value={motExpiry}
                  onChange={(e) => setMotExpiry(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9.5px] text-slate-500 uppercase font-black block">Next Service</label>
                <input
                  type="date"
                  required
                  value={serviceDue}
                  onChange={(e) => setServiceDue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9.5px] text-slate-500 uppercase font-black block">Insurance Expiry</label>
                <input
                  type="date"
                  required
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9.5px] text-slate-500 uppercase font-black block">Road Tax Due</label>
                <input
                  type="date"
                  required
                  value={roadTaxExpiry}
                  onChange={(e) => setRoadTaxExpiry(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-700"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white font-extrabold rounded-xl text-[11px] transition shadow-xs cursor-pointer"
              >
                Save Vehicle Specs
              </button>
            </div>

          </div>

          {/* Key Countdown blocks on the right */}
          <div className="lg:col-span-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 font-sans text-xs">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-50 pb-2 block flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600 animate-pulse" />
              Key Date Countdowns
            </span>

            <div className="space-y-3.5 pt-1">
              {/* Service */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl hover:bg-slate-100/50 transition">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-slate-800 text-[11px] block">Next Service</span>
                  <span className="text-[10px] text-slate-400 font-mono">Limit: {serviceDue}</span>
                </div>
                {renderDaysBadge(calculateDaysDiff(serviceDue))}
              </div>

              {/* Insurance */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl hover:bg-slate-100/50 transition">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-slate-800 text-[11px] block">Insurance Policy</span>
                  <span className="text-[10px] text-slate-400 font-mono">Limit: {insuranceExpiry}</span>
                </div>
                {renderDaysBadge(calculateDaysDiff(insuranceExpiry))}
              </div>

              {/* MOT */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl hover:bg-slate-100/50 transition">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-slate-800 text-[11px] block">MOT Certificate</span>
                  <span className="text-[10px] text-slate-400 font-mono">Limit: {motExpiry}</span>
                </div>
                {renderDaysBadge(calculateDaysDiff(motExpiry))}
              </div>

              {/* Road Tax */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl hover:bg-slate-100/50 transition">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-slate-800 text-[11px] block">Road Tax Status</span>
                  <span className="text-[10px] text-slate-400 font-mono">Limit: {roadTaxExpiry}</span>
                </div>
                {renderDaysBadge(calculateDaysDiff(roadTaxExpiry))}
              </div>
            </div>

          </div>

        </form>
      )}

      {/* 2. FUEL LOG BOOK */}
      {subTab === "fuel" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Quick Add Fuel Input Column */}
          <div className="lg:col-span-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <span className="text-xs font-black uppercase tracking-wide text-slate-850 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Fuel className="w-4 h-4 text-emerald-600 animate-pulse" />
              Log Fuel Station Fill
            </span>

            <form onSubmit={handleAddFuel} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Current Odometer (mi)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g., 42500"
                  value={fuelOdometer}
                  onChange={(e) => setFuelOdometer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Litres Loaded</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g., 45.5"
                    value={fuelLitres}
                    onChange={(e) => setFuelLitres(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Total Cost (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g., 68.20"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Purveyor/Station</label>
                <input
                  type="text"
                  placeholder="e.g., Shell Heathrow"
                  value={fuelStation}
                  onChange={(e) => setFuelStation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer"
              >
                Insert fuel Log
              </button>
            </form>

            {/* Quick Metrics */}
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2 mt-4 font-sans select-none">
              <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase block">Fuel Log Analytics</span>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-bold">Avg Fuel Price:</span>
                <span className="font-extrabold text-slate-800 font-mono">£{avgCostPerLitre}/L</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-bold">Est Average MPG:</span>
                <span className="font-extrabold text-slate-800 font-mono">48.5 mpg</span>
              </div>
            </div>

          </div>

          {/* List Fuel Log Table */}
          <div className="lg:col-span-8 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <span className="text-xs font-black uppercase tracking-wide text-slate-800 block">Fill-up Records &amp; Invoices</span>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-extrabold text-[9.5px] uppercase text-left">
                    <th className="pb-2.5">Date</th>
                    <th className="pb-2.5">Odometer</th>
                    <th className="pb-2.5">Volume (L)</th>
                    <th className="pb-2.5">Cost (£)</th>
                    <th className="pb-2.5">Station</th>
                    <th className="pb-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {fuelEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 text-[11px] text-slate-600 font-sans">
                      <td className="py-2.5 font-bold">{entry.date}</td>
                      <td className="py-2.5 font-mono">{entry.odometer.toLocaleString()} mi</td>
                      <td className="py-2.5 font-mono">{entry.litres.toFixed(1)} L</td>
                      <td className="py-2.5 font-mono font-bold text-slate-800">£{entry.cost.toFixed(2)}</td>
                      <td className="py-2.5 text-slate-450">{entry.station}</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => setFuelEntries(fuelEntries.filter(f => f.id !== entry.id))}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 3. WORKSHOP SERVICE HISTORY */}
      {subTab === "service" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Quick Service Form Column */}
          <div className="lg:col-span-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <span className="text-xs font-black uppercase tracking-wide text-slate-850 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Wrench className="w-4 h-4 text-emerald-600 animate-pulse" />
              Log Workshop Service
            </span>

            <form onSubmit={handleAddService} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Recorded Mileage (mi)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g., 39400"
                  value={serviceMil}
                  onChange={(e) => setServiceMil(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Service Description</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g., Oil change, rear brake pads, cabin filter renewal"
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Garage Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Mercedes London"
                    value={serviceGarage}
                    onChange={(e) => setServiceGarage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Total Cost (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g., 299.50"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer"
              >
                Insert Service Record
              </button>
            </form>
          </div>

          {/* List Service logs */}
          <div className="lg:col-span-8 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <span className="text-xs font-black uppercase tracking-wide text-slate-800 block">Workshop Logs History</span>
            
            <div className="space-y-3.5">
              {serviceEntries.map(entry => (
                <div key={entry.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-xs flex justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 text-[11px] font-sans">{entry.description}</span>
                      <span className="text-[8.5px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        {entry.mileage.toLocaleString()} mi
                      </span>
                    </div>
                    <div className="text-[10.5px] text-slate-400 font-sans leading-normal">
                      Garage Point: <strong className="text-slate-600">{entry.garage}</strong> · Log Date: <strong className="text-slate-650">{entry.date}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-900 font-mono shrink-0">
                      £{entry.cost.toFixed(2)}
                    </span>
                    <button
                      onClick={() => setServiceEntries(serviceEntries.filter(s => s.id !== entry.id))}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 4. TYRE MANAGE INTERACTIVE BOARD */}
      {subTab === "tyres" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          {/* Diagrams Layout tyre tracker */}
          <div className="lg:col-span-6 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 text-center">
            <span className="text-xs font-black uppercase tracking-wide text-slate-800 block mb-2 text-left">Chassis Tyre Tread Depth Diagram</span>

            <div className="max-w-xs mx-auto border-2 border-dashed border-slate-100 p-6 rounded-2xl relative bg-slate-50/30">
              
              {/* Visual steering grid */}
              <div className="w-1.5 h-full bg-slate-200 absolute left-1/2 top-0 transform -translate-x-1/2 -z-10 opacity-30" />
              
              {/* Top axle */}
              <div className="flex justify-between items-center mb-16">
                
                {/* FL */}
                <div className="space-y-1 bg-white p-3 border border-slate-200 rounded-xl shadow-xs w-28 text-center">
                  <span className="text-[8.5px] font-bold text-slate-400 block uppercase">FRONT LEFT</span>
                  <div className="text-base font-black text-slate-800 font-mono">{tyres.frontLeft.toFixed(1)} mm</div>
                  <input
                    type="range"
                    min="1.6"
                    max="8.5"
                    step="0.1"
                    value={tyres.frontLeft}
                    onChange={(e) => setTyres({ ...tyres, frontLeft: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className={`text-[8.5px] font-extrabold block ${tyres.frontLeft <= 2.2 ? "text-rose-600" : "text-emerald-600"}`}>
                    {tyres.frontLeft <= 2.2 ? "⚠ Replacement Advised" : "✓ Safe Tread"}
                  </span>
                </div>

                {/* FR */}
                <div className="space-y-1 bg-white p-3 border border-slate-200 rounded-xl shadow-xs w-28 text-center">
                  <span className="text-[8.5px] font-bold text-slate-400 block uppercase">FRONT RIGHT</span>
                  <div className="text-base font-black text-slate-800 font-mono">{tyres.frontRight.toFixed(1)} mm</div>
                  <input
                    type="range"
                    min="1.6"
                    max="8.5"
                    step="0.1"
                    value={tyres.frontRight}
                    onChange={(e) => setTyres({ ...tyres, frontRight: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className={`text-[8.5px] font-extrabold block ${tyres.frontRight <= 2.2 ? "text-rose-600" : "text-emerald-600"}`}>
                    {tyres.frontRight <= 2.2 ? "⚠ Replacement Advised" : "✓ Safe Tread"}
                  </span>
                </div>

              </div>

              {/* Lower axle */}
              <div className="flex justify-between items-center">
                
                {/* RL */}
                <div className="space-y-1 bg-white p-3 border border-slate-200 rounded-xl shadow-xs w-28 text-center">
                  <span className="text-[8.5px] font-bold text-slate-400 block uppercase">REAR LEFT</span>
                  <div className="text-base font-black text-slate-800 font-mono">{tyres.rearLeft.toFixed(1)} mm</div>
                  <input
                    type="range"
                    min="1.6"
                    max="8.5"
                    step="0.1"
                    value={tyres.rearLeft}
                    onChange={(e) => setTyres({ ...tyres, rearLeft: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className={`text-[8.5px] font-extrabold block ${tyres.rearLeft <= 2.2 ? "text-rose-600" : "text-emerald-600"}`}>
                    {tyres.rearLeft <= 2.2 ? "⚠ Replacement Advised" : "✓ Safe Tread"}
                  </span>
                </div>

                {/* RR */}
                <div className="space-y-1 bg-white p-3 border border-slate-200 rounded-xl shadow-xs w-28 text-center">
                  <span className="text-[8.5px] font-bold text-slate-400 block uppercase">REAR RIGHT</span>
                  <div className="text-base font-black text-slate-800 font-mono">{tyres.rearRight.toFixed(1)} mm</div>
                  <input
                    type="range"
                    min="1.6"
                    max="8.5"
                    step="0.1"
                    value={tyres.rearRight}
                    onChange={(e) => setTyres({ ...tyres, rearRight: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className={`text-[8.5px] font-extrabold block ${tyres.rearRight <= 2.2 ? "text-rose-600" : "text-emerald-600"}`}>
                    {tyres.rearRight <= 2.2 ? "⚠ Replacement Advised" : "✓ Safe Tread"}
                  </span>
                </div>

              </div>

            </div>
          </div>

          {/* Guidelines info side column */}
          <div className="lg:col-span-6 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 text-xs font-sans">
            <span className="text-xs font-black uppercase tracking-wide text-slate-800 block border-b border-slate-50 pb-2 flex items-center gap-1.5">
              <Disc className="w-4 h-4 text-indigo-505" />
              UK Tyres Tread Safety Standards
            </span>
            
            <p className="leading-relaxed text-slate-400">
              The legal minimum tread depth for private hire vehicles and cars in the United Kingdom is <strong className="text-slate-700">1.6mm</strong> across the central three-quarters of the breadth of the tread.
            </p>

            <ul className="space-y-2 text-slate-500 pt-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>5.0mm - 8.5mm</strong>: Optimal condition safety grips.</span>
              </li>
              <li className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500 shrink-0" />
                <span><strong>3.0mm - 4.9mm</strong>: Standard wear. Monitor on seasonal audits.</span>
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span><strong>Below 2.2mm</strong>: Advisories flagged. Plan workshop replacement immediately.</span>
              </li>
            </ul>

            <div className="p-4 bg-slate-900 text-white rounded-xl leading-normal">
              <strong>Tip on MOT audits:</strong> Tyres with low treads contribute directly to failure notices on the TfL compliance checklist. Update sliders whenever you change or rotate tyres to maintain active status.
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
