import React, { useState } from "react";
import { Expense } from "../../types";
import { Trash2, FileSpreadsheet, Plus, AlertCircle, Fuel, Sparkles, Landmark, BadgeCheck, ClipboardList } from "lucide-react";

interface ExpensesTabProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

export function ExpensesTab({ expenses, onAddExpense, onDeleteExpense }: ExpensesTabProps) {
  const [type, setType] = useState<Expense["type"]>("Fuel");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  const handleAddExpensesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      alert("Please input a valid positive decimal quantity quantity.");
      return;
    }

    const newExp: Expense = {
      id: "exp-" + Date.now(),
      type,
      amount: val,
      description: desc.trim() || `${type} operational expense logged`,
      dateTime: new Date().toISOString()
    };

    onAddExpense(newExp);
    setAmount("");
    setDesc("");
  };

  const handleExpCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Expense ID,Type,Amount (GBP),Description,Logged Date & Time\r\n";
    
    expenses.forEach(e => {
      const row = [
        e.id,
        e.type,
        e.amount.toFixed(2),
        `"${e.description.replace(/"/g, '""')}"`,
        e.dateTime
      ].join(",");
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FareFreedom_ExpensesLedger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aggregated filters totals
  const totalFuel = expenses.filter(e => e.type === "Fuel").reduce((sum, e) => sum + e.amount, 0);
  const totalTolls = expenses.filter(e => e.type === "Airport Toll").reduce((sum, e) => sum + e.amount, 0);
  const totalOther = expenses.filter(e => e.type !== "Fuel" && e.type !== "Airport Toll").reduce((sum, e) => sum + e.amount, 0);
  const totalWhole = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      
      {/* Aggregation stat widgets block */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Fuel operational cost</span>
          <span className="text-xl font-black font-sans text-amber-600 mt-1 block">£{totalFuel.toFixed(2)}</span>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Airport Toll Charges</span>
          <span className="text-xl font-black font-sans text-blue-600 mt-1 block">£{totalTolls.toFixed(2)}</span>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Other operational costs</span>
          <span className="text-xl font-black font-sans text-indigo-600 mt-1 block">£{totalOther.toFixed(2)}</span>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Gross Outflow</span>
          <span className="text-xl font-black font-sans text-slate-900 mt-1 block">£{totalWhole.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left hand Add Expense Ledger Form (5 Cols) */}
        <form onSubmit={handleAddExpensesSubmit} className="lg:col-span-5 bg-white border border-slate-100 p-5 rounded-xl shadow-sm space-y-4">
          <span className="text-xs font-black uppercase text-slate-800 tracking-wide border-b border-slate-50 pb-2 block">
            Add Operational Outflow Record
          </span>

          <div className="space-y-3.5">
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Expense category Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Expense["type"])}
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-700"
              >
                <option value="Fuel">⛽ Fuel / Petrol / Diesel</option>
                <option value="Airport Toll">🎫 Airport Toll Drop-off Charges</option>
                <option value="Insurance">🛡️ Hire &amp; Reward Taxi Insurance</option>
                <option value="Maintenance">🔧 Vehicle Maintenance &amp; Servicing</option>
                <option value="Phone">📱 Mobile Phone Data Contract</option>
                <option value="Car Wash">🧽 Car Wash / Chemical Polish</option>
                <option value="Other">💼 Other Miscellaneous Tools</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Amount Value (£)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="40.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2.5 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Ledger Description (Optional)</label>
              <textarea
                placeholder="Shell Service Station, fuel receipt"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full h-20 bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white rounded-lg p-2.5 text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-slate-950 text-white hover:bg-slate-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Book Expense Voucher
            </button>
          </div>
        </form>

        {/* Right hand listings (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-100 p-5 rounded-xl shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <span className="text-xs font-black uppercase text-slate-800 tracking-wide">
              Recent Operational Expenditures Log
            </span>
            <button 
              onClick={handleExpCSV}
              disabled={expenses.length === 0}
              className="text-[10px] bg-slate-100 text-slate-700 font-extrabold border border-slate-150 rounded px-2.5 py-1 transition flex items-center gap-1 hover:bg-slate-200 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export ledger
            </button>
          </div>

          <div className="space-y-2.5">
            {expenses.length === 0 ? (
              <div className="text-center py-10">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span className="text-xs text-slate-400 font-sans block">No expenses logged yet.</span>
              </div>
            ) : (
              expenses.map((e) => {
                const dateStr = new Date(e.dateTime).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short"
                });

                return (
                  <div key={e.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-100 text-slate-600 shrink-0">
                        {e.type === "Fuel" ? (
                          <Fuel className="w-4 h-4 text-amber-600" />
                        ) : e.type === "Airport Toll" ? (
                          <Landmark className="w-4 h-4 text-blue-500" />
                        ) : (
                          <ClipboardList className="w-4 h-4 text-indigo-500" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900">{e.type}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-bold">({dateStr})</span>
                        </div>
                        <p className="text-slate-500 text-[11px] leading-tight font-sans font-bold">{e.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-slate-900">£{e.amount.toFixed(2)}</span>
                      <button 
                        onClick={() => onDeleteExpense(e.id)}
                        className="text-slate-400 hover:text-red-500 p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 transition"
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

      </div>
    </div>
  );
}
