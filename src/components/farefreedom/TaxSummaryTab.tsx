import React, { useState } from "react";
import { Trip, Expense } from "../../types";
import { Landmark, AlertTriangle, Calculator, FileSpreadsheet, ShieldAlert, Award, FileText } from "lucide-react";

interface TaxSummaryTabProps {
  trips: Trip[];
  expenses: Expense[];
}

export function TaxSummaryTab({ trips, expenses }: TaxSummaryTabProps) {
  const [taxYear, setTaxYear] = useState<"25_26" | "24_25">("25_26");

  // Determine date bounds matching UK tax years (April 6 to April 5)
  const getTaxYearBounds = () => {
    if (taxYear === "25_26") {
      return { start: new Date("2025-04-06T00:00:00"), end: new Date("2026-04-05T23:59:59") };
    } else {
      return { start: new Date("2024-04-06T00:00:00"), end: new Date("2025-04-05T23:59:59") };
    }
  };

  const bounds = getTaxYearBounds();

  // Filter trips and expenses in that year
  const activeTrips = trips.filter(t => {
    const d = new Date(t.dateTime);
    return d >= bounds.start && d <= bounds.end;
  });

  const activeExpenses = expenses.filter(e => {
    const d = new Date(e.dateTime);
    return d >= bounds.start && d <= bounds.end;
  });

  // Gross Earnings
  const grossIncome = activeTrips.reduce((acc, t) => acc + t.fareGbp, 0);

  // Business Expenses (Actual logged)
  const businessExpensesActual = activeExpenses.reduce((acc, e) => acc + e.amount, 0);

  // HMRC Mileage Allowance Deduction calculation:
  // 45p per mile for the first 10,000 miles, 25p per mile thereafter
  const totalMilesDriven = activeTrips.reduce((acc, t) => acc + t.distanceMiles, 0);
  let mileageAllowanceDeduction = 0;
  if (totalMilesDriven <= 10000) {
    mileageAllowanceDeduction = totalMilesDriven * 0.45;
  } else {
    mileageAllowanceDeduction = (10000 * 0.45) + ((totalMilesDriven - 10000) * 0.25);
  }

  // Self-employed drivers can choose simplified mileage deduction or actual expenses.
  // We use actual expenses as defaulted, but show Mileage Allowance comparison!
  const bestExpenseClaim = Math.max(businessExpensesActual, mileageAllowanceDeduction);

  // Net Profit
  const taxableProfitRef = Math.max(0, grossIncome - bestExpenseClaim);

  // UK Income Tax & NI calculations for 2025/2026 tax bands:
  // Personal Allowance: £12,570 (Tax free)
  // Basic Rate: 20% on profit between £12,570 and £50,270
  // Higher Rate: 40% on profit above £50,270
  const personalAllowance = 12570;
  let incomeTax = 0;
  if (taxableProfitRef > personalAllowance) {
    const taxableIncome = taxableProfitRef - personalAllowance;
    if (taxableIncome <= 37700) {
      incomeTax = taxableIncome * 0.20;
    } else {
      incomeTax = (37700 * 0.20) + ((taxableIncome - 37700) * 0.40);
    }
  }

  // Class 2 National Insurance: Simulating flat rate £179.40/year if net profit > £12,570
  const class2Ni = taxableProfitRef > personalAllowance ? 179.40 : 0;

  // Class 4 National Insurance: 9% on profit above £12,570 (up to £50,270) plus 2% above
  let class4Ni = 0;
  if (taxableProfitRef > personalAllowance) {
    const niBase = taxableProfitRef - personalAllowance;
    if (niBase <= 37700) {
      class4Ni = niBase * 0.09;
    } else {
      class4Ni = (37700 * 0.09) + ((niBase - 37700) * 0.02);
    }
  }

  const totalLiability = incomeTax + class2Ni + class4Ni;

  // Payment on Account (POA): 50% of current year's tax bill as advance payment
  const paymentOnAccount = totalLiability * 0.50;

  return (
    <div className="space-y-6">
      
      {/* Selector and export Header */}
      <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase text-indigo-600 font-extrabold font-mono tracking-wider block">HMRC Simplified Expenses Ledger</span>
          <h3 className="font-extrabold text-sm text-slate-900 mt-0.5">Automated Tax Estimator System</h3>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(e.target.value as "25_26" | "24_25")}
            className="bg-slate-50 border border-slate-200 text-xs font-bold font-sans rounded-xl p-2.5 focus:outline-none"
          >
            <option value="25_26">🇬🇧 Tax Year 2025-26 (Apr 6 – Apr 5)</option>
            <option value="24_25">🇬🇧 Tax Year 2024-25 (Apr 6 – Apr 5)</option>
          </select>
        </div>
      </div>

      {/* Math ledger sheets layouts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Ledger Breakdown (7 Columns) */}
        <div className="lg:col-span-7 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
            <Calculator className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-black uppercase text-slate-800 tracking-wide">UK Self-Assessment Breakdown</span>
          </div>

          <div className="space-y-3.5 text-xs text-slate-700 font-sans leading-normal">
            
            {/* Row 1: Gross Revenue */}
            <div className="flex justify-between items-baseline p-2 bg-slate-50 rounded-lg">
              <span className="font-bold flex items-center gap-1">Gross Settled Revenue (Trips)</span>
              <strong className="text-slate-900 font-mono text-xs">£{grossIncome.toFixed(2)}</strong>
            </div>

            {/* Row 2: Actual business expenses logged */}
            <div className="flex justify-between items-baseline p-2 bg-slate-50/50 rounded-lg">
              <span className="font-bold">Actual Logged Expenditures</span>
              <span className="text-slate-600 font-mono">£{businessExpensesActual.toFixed(2)}</span>
            </div>

            {/* Row 3: HMRC Mileage allowance comparison */}
            <div className="p-3 bg-blue-50/40 rounded-lg border border-blue-50/80 space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-blue-800">HMRC Approved Mileage Allowance</span>
                <span className="text-blue-700 font-mono font-bold">£{mileageAllowanceDeduction.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                Calculated flat-rate at 45p/mi for the first 10,000 miles, then 25p. (Your Year Miles: <strong>{totalMilesDriven.toFixed(0)} mi</strong>)
              </p>
            </div>

            {/* Informative Comparison */}
            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wide">
              <span>✓ System automatically selected claim category:</span>
              <span className="text-slate-700 underline">
                {businessExpensesActual > mileageAllowanceDeduction ? "Actual Receipts Ledger" : "HMRC Simplified Mileage (£" + mileageAllowanceDeduction.toFixed(1) + ")"}
              </span>
            </div>

            {/* Row 4: Net Taxable Profit */}
            <div className="flex justify-between items-baseline p-2.5 bg-slate-900 text-white rounded-lg border-0 shadow">
              <span className="font-extrabold uppercase text-[10px] tracking-wider">HMRC Taxable Net Profit</span>
              <strong className="font-mono text-sm leading-none">£{taxableProfitRef.toFixed(2)}</strong>
            </div>

            {/* Allowances Table */}
            <div className="space-y-1 px-1">
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Less: Tax-Free Personal Allowance</span>
                <span>-£{personalAllowance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Estimated Basic Rate Tax (20%)</span>
                <span>£{incomeTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Class 2 National Insurance (Flat)</span>
                <span>£{class2Ni.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Class 4 National Insurance (9%)</span>
                <span>£{class4Ni.toFixed(2)}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Total tax liabilities & disclamers cards (5 Columns) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900 text-white p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-0 top-0 w-24 h-24 bg-red-600/15 blur-2xl rounded-full animate-pulse" />
            <span className="text-[9px] uppercase text-red-400 font-extrabold font-mono tracking-widest block">Liability Projection</span>
            <span className="text-4xl font-black font-mono mt-2 block text-white">£{totalLiability.toFixed(2)}</span>
            <p className="text-[10px] text-slate-400 font-mono mt-1 font-bold">Total Estimated Tax &amp; National Insurance due</p>
            
            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-between items-center text-xs font-sans text-slate-300">
              <span className="font-bold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" /> Payment on Account (POA 50%)
              </span>
              <strong className="text-slate-100 font-mono">£{paymentOnAccount.toFixed(2)}</strong>
            </div>
          </div>

          <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl text-amber-800 space-y-2">
            <div className="flex items-center gap-1.5 font-bold font-sans text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /> Important Regulatory Disclaimer
            </div>
            <p className="text-[10px] text-amber-700/90 leading-normal font-sans font-medium">
              These calculations are estimations based strictly on general HMRC 2025-2026 simplified self-assessment structures. They do not account for individual student loans, other salaries, savings dividends, or complex business asset capital depreciation. 
            </p>
            <p className="text-[10px] font-bold text-amber-900 font-sans italic">
              "Estimate only — please consult with a certified UK Chartered accountant or tax specialist before filing."
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
