import React from "react";
import { Trip } from "../../types";
import { Trash2, FileSpreadsheet, Sparkles, TrendingUp, CreditCard, Coins, CheckCircle, Ticket } from "lucide-react";

interface TripHistoryTabProps {
  trips: Trip[];
  onDeleteTrip: (id: string) => void;
}

export function TripHistoryTab({ trips, onDeleteTrip }: TripHistoryTabProps) {
  // Stats computation
  const totalEarnings = trips.reduce((acc, t) => acc + t.fareGbp, 0);
  const totalCard = trips.filter(t => t.paymentMethod === "card").reduce((acc, t) => acc + t.fareGbp, 0);
  const totalCash = trips.filter(t => t.paymentMethod === "cash").reduce((acc, t) => acc + t.fareGbp, 0);

  // Dynamic CSV content generation 
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Trip ID,Customer,Pickup,Destination,Distance (Miles),Fare (GBP),Payment Method,Date & Time,Mode\r\n";
    
    trips.forEach(t => {
      const row = [
        t.id,
        `"${t.customerName.replace(/"/g, '""')}"`,
        `"${t.pickupAddress.replace(/"/g, '""')}"`,
        `"${t.destinationAddress.replace(/"/g, '""')}"`,
        t.distanceMiles,
        t.fareGbp.toFixed(2),
        t.paymentMethod.toUpperCase(),
        t.dateTime,
        t.mode
      ].join(",");
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FareFreedom_CompletedTrips_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* 3 Block summary statistics totals rows */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Revenue</span>
            <span className="text-lg font-black text-slate-900 font-sans mt-0.5 block">£{totalEarnings.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Sum Card Terminal</span>
            <span className="text-lg font-black text-slate-900 font-sans mt-0.5 block">£{totalCard.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Traditional Cash Receipts</span>
            <span className="text-lg font-black text-slate-900 font-sans mt-0.5 block">£{totalCash.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Primary listings header Actions row */}
      <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex justify-between items-center">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900">Historical Finished Runs Sheet</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Records of completely settled and finalized duties</p>
        </div>
        <button 
          onClick={handleExportCSV}
          disabled={trips.length === 0}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          Export Ledger (CSV)
        </button>
      </div>

      {/* Trips lists loops */}
      <div className="space-y-3">
        {trips.length === 0 ? (
          <div className="text-center py-10 bg-white border border-slate-100 rounded-xl">
            <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <span className="text-xs text-slate-400 font-sans">No completed trips logged in database yet. Move pending bookings to settlement to render records here.</span>
          </div>
        ) : (
          trips.map((t) => {
            const dateStr = new Date(t.dateTime).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric"
            });
            const timeStr = t.dateTime.split("T")[1]?.slice(0, 5) || "";

            return (
              <div key={t.id} className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-slate-200 transition">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 text-slate-700 font-black font-sans text-xs flex items-center justify-center shrink-0">
                    {t.customerName.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{t.customerName}</span>
                      <span className={`text-[9.5px] uppercase font-mono font-bold px-1.5 py-0.5 rounded ${
                        t.mode === "Meter" ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-800"
                      }`}>
                        {t.mode}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">
                        {dateStr} · {timeStr}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-sans font-bold leading-relaxed">
                      {t.pickupAddress} ➔ {t.destinationAddress}
                    </p>

                    <div className="text-[10px] font-mono text-slate-400">
                      OdoFilter: <strong className="text-slate-700">{t.distanceMiles} miles</strong> · Payment settled via: <strong className="text-slate-800 uppercase font-bold">{t.paymentMethod}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-between sm:justify-start">
                  <span className="text-base font-black text-slate-900 font-sans">£{t.fareGbp.toFixed(2)}</span>
                  <button 
                    onClick={() => onDeleteTrip(t.id)}
                    className="text-slate-400 hover:text-red-500 p-2 hover:bg-slate-50 rounded-lg transition"
                    title="Delete reference"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
