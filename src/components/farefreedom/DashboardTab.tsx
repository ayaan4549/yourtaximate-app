import React from "react";
import { Booking, Trip, Expense } from "../../types";
import { TrendingUp, Award, Calendar, Wallet, Landmark, Fuel, Briefcase, PlusCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

interface DashboardTabProps {
  bookings: Booking[];
  trips: Trip[];
  expenses: Expense[];
  onNavigateToTab: (tab: string) => void;
  driverName?: string;
}

export function DashboardTab({ bookings, trips, expenses, onNavigateToTab, driverName }: DashboardTabProps) {
  // Helpers to calculate stats
  const todayStr = new Date().toISOString().split("T")[0];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  }).reverse();

  // Stats computation
  const todayTrips = trips.filter(t => t.dateTime.startsWith(todayStr));
  const todayEarnings = todayTrips.reduce((acc, t) => acc + t.fareGbp, 0);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekTrips = trips.filter(t => new Date(t.dateTime) >= oneWeekAgo);
  const weekEarnings = weekTrips.reduce((acc, t) => acc + t.fareGbp, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthTrips = trips.filter(t => new Date(t.dateTime) >= startOfMonth);
  const monthEarnings = monthTrips.reduce((acc, t) => acc + t.fareGbp, 0);

  const futureBookings = bookings.filter(b => b.status === "pending");

  // Recharts Chart preparation (Last 7 Days)
  const chartData = last7Days.map(dateStr => {
    const dayTrips = trips.filter(t => t.dateTime.startsWith(dateStr));
    const dayFares = dayTrips.reduce((sum, t) => sum + t.fareGbp, 0);
    const dateObj = new Date(dateStr);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    return {
      name: dayNames[dateObj.getDay()],
      fullDate: dateStr,
      amount: parseFloat(dayFares.toFixed(2)),
      count: dayTrips.length
    };
  });

  // Analytics
  let bestDayName = "N/A";
  let bestDayAmount = 0;
  chartData.forEach(d => {
    if (d.amount > bestDayAmount) {
      bestDayAmount = d.amount;
      bestDayName = d.name;
    }
  });

  const dailyAverage = weekEarnings / 7;
  const weekTripCount = weekTrips.length;

  // Expenses Breakdown this month
  const monthExpenses = expenses.filter(e => new Date(e.dateTime) >= startOfMonth);
  const fuelTotal = monthExpenses.filter(e => e.type === "Fuel").reduce((sum, e) => sum + e.amount, 0);
  const meetGreetTotal = monthExpenses.filter(e => e.type === "Airport Toll" || e.description.toLowerCase().includes("meet")).reduce((sum, e) => sum + e.amount, 0);
  const tollTotal = monthExpenses.filter(e => e.type === "Airport Toll").reduce((sum, e) => sum + e.amount, 0);
  const otherTotal = monthExpenses.filter(e => e.type !== "Fuel" && e.type !== "Airport Toll" && !e.description.toLowerCase().includes("meet")).reduce((sum, e) => sum + e.amount, 0);
  const totalExpensesSum = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const netTakeHome = monthEarnings - totalExpensesSum;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-50 pb-4">
        <div>
          <h1 className="text-lg font-black font-display text-slate-900 tracking-tight">
            {driverName ? `${driverName}'s Dashboard` : "Dashboard"}
          </h1>
          <p className="text-[10px] text-slate-400 mt-0.5">Automated UK private hire ledger tracking & general mileage analytics</p>
        </div>
        <span className="text-[9px] bg-slate-950 text-white font-mono font-bold px-2.5 py-1 rounded-lg">
          ACTIVE PROFILE
        </span>
      </div>

      {/* 4 Block Stats Dashboard Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Today's Gross</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-900">£{todayEarnings.toFixed(2)}</span>
            <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
              {todayTrips.length} jobs
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider block">This Week</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-900">£{weekEarnings.toFixed(2)}</span>
            <span className="text-[9px] font-mono font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
              Last 7d
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider block">This Month</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-950">£{monthEarnings.toFixed(2)}</span>
            <span className="text-[9px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              Calendar
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Upcoming Runs</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-900">{futureBookings.length}</span>
            <button
              onClick={() => onNavigateToTab("bookings")}
              className="text-[9px] font-sans font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-0.5"
            >
              Add New +
            </button>
          </div>
        </div>
      </div>

      {/* Main Bar Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Weekly earnings chart (8 columns) */}
        <div className="lg:col-span-8 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">7-Day Earnings Analytics</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Automated gross revenue track based on completed jobs</p>
            </div>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>

          <div className="h-48 w-full font-mono text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-xl text-[10px] font-mono border border-slate-800 shadow-md">
                          <p className="font-bold font-sans text-xs">{data.name} ({data.fullDate})</p>
                          <p className="text-blue-400 mt-1">Fare: £{data.amount.toFixed(2)}</p>
                          <p className="text-slate-400">Total Runs: {data.count}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={26}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.amount > 0 ? '#2563eb' : '#cbd5e1'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Core Analytics Row */}
          <div className="grid grid-cols-3 gap-2 text-center pt-2 mt-1 border-t border-slate-50">
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Best Day</span>
              <span className="text-xs font-black text-slate-800 tracking-tight block mt-1">
                {bestDayName} {bestDayAmount > 0 ? `(£${bestDayAmount.toFixed(0)})` : "—"}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Last 7d Avg</span>
              <span className="text-xs font-black text-slate-800 tracking-tight block mt-1">
                £{dailyAverage.toFixed(2)}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Trip Count</span>
              <span className="text-xs font-black text-blue-700 tracking-tight block mt-1">
                {weekTripCount} completed
              </span>
            </div>
          </div>
        </div>

        {/* Expenses & Net Flow (4 columns) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-5">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Monthly Net Profit</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Gross minus operational expenses</p>
          </div>

          {/* Circular indicator or simple progression banner */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-blue-600/20 blur-2xl rounded-full" />
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Net Take-Home Estimator</span>
            <span className="text-2xl font-black text-white mt-1.5 block">£{netTakeHome.toFixed(2)}</span>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Gross: £{monthEarnings.toFixed(2)}</span>
            </div>
          </div>

          {/* Expense Breakdown Ledger Bar Charts */}
          <div className="space-y-3.5">
            <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Month Expenses Breakdown</span>
            <div className="space-y-2.5 text-xs text-slate-700 font-sans">
              
              {/* Expense Category 1: Fuel */}
              <div className="space-y-1">
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Fuel className="w-3.5 h-3.5 text-amber-500" /> Fuel Gas
                  </span>
                  <span className="font-mono font-bold text-slate-900">£{fuelTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Expense Category 2: Meet & Greet */}
              <div className="space-y-1">
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-500" /> Meet &amp; Greet
                  </span>
                  <span className="font-mono font-bold text-slate-900">£{meetGreetTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Expense Category 3: Tolls */}
              <div className="space-y-1">
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Landmark className="w-3.5 h-3.5 text-blue-500" /> Airport Tolls
                  </span>
                  <span className="font-mono font-bold text-slate-900">£{tollTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Expense Category 4: Other */}
              <div className="space-y-1">
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Wallet className="w-3.5 h-3.5 text-indigo-500" /> Other/Maint
                  </span>
                  <span className="font-mono font-bold text-slate-900">£{otherTotal.toFixed(2)}</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
